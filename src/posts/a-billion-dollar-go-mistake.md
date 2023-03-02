---
title: A Billion Dollar Go Mistake
excerpt: A small Golang mistake that could cost a Million Dollars.
date: 2023-02-26
draft: false
tags:
  - golang
  - testing
---

> This post is about a real problem we faced in our project.

I hope after reading this post you will be able to avoid the same mistake we did in our project 😅. 
This small mistake didn't cost us a million dollars. But, It did cost us a few thousand, and the Prometheus alerts saved us.

But, it could cost you a Million if you are not careful 💸.

The scenario is a simple database transaction. We all have used database transactions at least once in our programming life. 
If you don't know how transactions work you could read the docs [here](https://www.postgresql.org/docs/current/tutorial-transactions.html) for Postgres.

Our service handles the management of some Subscriptions in the database. All the changes to the rows happen within a transaction. 
The service is in Golang and the flow is like this:
- Start the transaction
- Fetch the record by ID 
- Confirm if the operation for the change is possible
- If Yes, then update the record
- Commit the transaction
- For any error, revert the transaction

To fetch a record and acquire a lock on the record so that other flows would wait to update, we use `SELECT ... FOR UPDATE`
query to fetch the record from Postgres and lock it.

> **Note\:** We use [sqlx](https://github.com/jmoiron/sqlx) lib for database access.

The repository code is like this:

```go

func (r *fetcher) GetSubscription(tx *sqlx.Tx, id uuid.UUID) (*model.Subscription, error) {
    var subscription model.Subscription
    err := tx.Get(&subscription, `
        SELECT * FROM subscriptions
        WHERE id = $1
        FOR UPDATE
    `, id)
    if err != nil {
        return nil, err
    }
	
    return &subscription, nil
}

```

The service code is like this:

```go

func (s *service) CancelSubscription(ctx context.Context, id uuid.UUID) (*model.Subscription, error) {
    tx, err := s.db.BeginTxx(ctx, nil)
    if err != nil {
        return nil, err
    }
	
    defer func() {
        if err != nil {
            tx.Rollback()
        }
    }()
    
    subscription, err := s.fetcher.GetSubscription(tx, id)
    if err != nil {
        return nil, err
    }

    if subscription.CancelledAt != nil {
        return subscription, nil
    }
	
    subscription.CancelledAt = time.Now()

    err = s.updater.UpdateSubscription(tx, subscription)
    if err != nil {
        return nil, err
    }

    err = tx.Commit()
    if err != nil {
        return nil, err
    }

    return subscription, nil
}
```

## Problem

All client requests were timing out, and the DB connection spiked over 1.2k connections 😅

Not a single request was able to complete the operation. It was a stop-the-world event 🤣

![cry](https://media.giphy.com/media/XD4qHZpkyUFfq/giphy.gif)

**Why?**

The issue happens when we try to cancel a subscription that is already cancelled. If the subscription is already cancelled
we return the subscription without doing any changes, but we are not releasing the lock on the record.

The reason is the `defer` function calls `tx.Rollback()` only when there is an error. This would cause the lock to be active 
until the transaction commits or roll back. But since we are not doing any of the two things, the lock is held 
until the transaction times out.

If the service is having high traffic, the transactions could not time out. This will cause the code to create
new connections to the database and exhaust the connection pool.

## Fix

There are three ways to fix this issue at the service layer. 
To keep the post short, I have explained the other ways in a different post.

1. Release the lock in every `if` condition.

```go
// Error handling is omitted for brevity
if subscription.CancelledAt != nil {
    _ = tx.Rollback() // release the lock

    return subscription, nil
}

```
This is the simplest way to fix the issue. But this would need you to rollback in every `if` condition.
And if you forget to rollback in any of the `if` conditions, you would end up with the same issue.

2. Rollback the transaction in the `defer` function for every case.

```go
// Error handling is omitted for brevity
defer func() {
   _ = tx.Rollback()
}()

```
This would release the lock in every case. For committed transactions and as per the tracing, we see some milliseconds
the code spends to roll back the transactions. In case of committed transactions the rollback does nothing.
But this is a better way to fix the issue.

3. Commit the transaction in the `defer` function for every case.

```go
defer func() {
  if err != nil {
    _ = tx.Rollback()
  }
  
  commitErr := tx.Commit()
  // handle commitErr
}
```
If there are no changes the transaction will commit without any change. If there is any error only then the 
rollback would happen and will release the lock.

But, this affects the readability of the code. Your commit is happening in the `defer` function, and that's an extra
pointer you have to keep in mind while reading the code.

## Service Layer - Return Error 👾

The problem with the service is that for validations, it is not returning any error. The other way to fix this issue is to
return an error from the `if` condition. This would make the `Rollback` happen in the `defer` function.

And that is also a very clean way. A service should have only one responsibility. Either it completes the operation 
or it returns an error. It should return error in case of validation failure. This is a good practice
and something we missed in our project. We fixed the issue later by returning an error from the `if` condition.

This change also helps the handler to decide what HTTP status code to return. Which is really helpful as we can return
`400 Bad Request` for validation errors.

This is how the code would look like after refactoring

```go
var ErrSubscriptionAlreadyCancelled = errors.New("subscription already cancelled")

func (s *service) CancelSubscription(ctx context.Context, id uuid.UUID) (*model.Subscription, error) {
    tx, err := s.db.BeginTxx(ctx, nil)
    if err != nil {
        return nil, err
    }
	
    defer func() {
        if err != nil {
            tx.Rollback()
        }
    }()
    
    subscription, err := s.fetcher.GetSubscription(tx, id)
    if err != nil {
        return nil, err
    }

    if subscription.CancelledAt != nil {
        return subscription, ErrSubscriptionAlreadyCancelled
    }
	
    subscription.CancelledAt = time.Now()

    err = s.updater.UpdateSubscription(tx, subscription)
    if err != nil {
        return nil, err
    }

    err = tx.Commit()
    if err != nil {
        return nil, err
    }

    return subscription, nil
}
```


## Conclusion

My personal preference is the second option. But you could choose any of the three options based on your preference.
I am choosing the second option because I am sure that whatever happens in the flow at the end, the transaction
revert will happen. Yes, it would cost me a few milliseconds in case of a committed transaction, but compared to the loss to
the business, it's worth.

Keep in mind that the service layer has only one responsibility. Either it completes the operation or it returns an error.

You may be thinking that a better approach is to have an abstraction that takes care of transactions. I agree,
and would also have a separate post on that. But, I also think that we can avoid the complexity of abstraction if the code is stable and not changes too often.

The golang official post for transactions also supports the reasoning. Check the code snippet [here](https://go.dev/doc/database/execute-transactions#example).
The office post also uses the second option.


```go
// code snippet from the golang official post
func CreateOrder(ctx context.Context, albumID, quantity, custID int) (orderID int64, err error) {

  // Create a helper function for preparing failure results.
  fail := func (err error) (int64, error) {
    return fmt.Errorf("CreateOrder: %v", err)
  }

  // Get a Tx for making transaction requests.
  tx, err := db.BeginTx(ctx, nil)
  if err != nil {
    return fail(err)
  }
  // Defer a rollback in case anything fails.
  defer tx.Rollback()
  
  ... // other code is omitted for brevity
  
  // Commit the transaction.
  if err = tx.Commit(); err != nil {
    return fail(err)
  }
  
  // Return the order ID.
  return orderID, nil
}
```
---

This brings us to the end of this post. I hope you enjoyed reading this post. There is a part two to this post, where I will
talk about having another layer of protection to prevent this issue.

If you have any questions or suggestions, feel free to reach out to me using the AMA.
