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
This small mistake didn't cost us a million dollars, it did cost us a few thousands, and we were saved by the prometheus alerts 
that caught the issue quickly. 

However, it could cost you a Million if you are not careful 💸.

The scenario is a simple database transaction one. We all have used db transaction at-least once in our programming life.
If you don't know how transactions works you could read the docs [here](https://www.postgresql.org/docs/current/tutorial-transactions.html) for postgres.

Our service that is responsible for managing some state in the database and the changes 
to the rows are done within a transaction. The service is written in Golang and the flow is like this:
- Initiate the transaction
- Fetch the record by ID 
- Validate if the operation for state change could be performed
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

The issue happens when we try to cancel a subscription that is already cancelled. If the subscription is already cancelled
we return the subscription without doing any changes, but we are not releasing the lock on the record.

The reason is `defer` function calls `tx.Rollback()` only when there is an error. This would cause the lock to be held 
until the transaction is committed or rolled back. But since we are not doing any of the two things, the lock is held 
until the transaction times out.

However, if the service is having high traffic, the transactions could not timeout quickly causing the code to create
new connections to the database and eventually exhausting the connection pool.

## Fix

There are three ways to fix this issue at the service layer. 
To keep the post short, I have explained the other ways here.

1. Release the lock in every if condition.

```go
// Error handling is omitted for brevity
if subscription.CancelledAt != nil {
    _ = tx.Rollback() // release the lock

    return subscription, nil
}

```
This is the simplest way to fix the issue. But this would require you to release the lock in every if condition.
And if you forget to release the lock in any of the if condition, you would end up with the same issue.

2. Rollback the transaction in the `defer` function for every case.

```go
// Error handling is omitted for brevity
defer func() {
   _ = tx.Rollback()
}()

```
This would release the lock in every case even if the transaction is committed. But as per the tracing we see some milliseconds
the code spends to rollback the transactions. But I think this is a better way to fix the issue.

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
This would release the lock by committing the transaction even if you are not doing any change to record.
If there is any error while performing the operation, the rollback would be called and the lock would be released.

However, this affects the readability of the code. Your commit is happening in the `defer` function, and that's an extra
pointer you have to keep in mind while reading the code.

## Conclusion

My personal preference is the second option. But you could choose any of the three options based on your preference.
I am choosing the second option because I am sure that whatever happens in the flow at the end, the transaction
would be rolled back and the lock would be released. Yes, it would cost me a few milliseconds, but compared to the loss to 
business, it's worth it.

Many of you might be thinking that a better approach is to have an abstraction that takes care of transactions. I agree,
and would also have a separate post on that. However, I also think that sometimes when the code is simple and not frequently
changing, it's better to have the transaction logic in the service layer itself and avoid the overhead of abstraction.

Also, to back the reasoning I also saw the golang official post for transactions suggesting same approach, check the code snippet
[here](https://go.dev/doc/database/execute-transactions#example)

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
talk about how to have another layer of protection to prevent this issue from happening at the server level.

If you have any questions or suggestions, feel free to reach out to me using the AMA.
