---
title: A Billion Dollar Go Mistake - Part 2
excerpt: Correctly handle DB transaction using Serverside and Clientside timeouts.
date: 2023-03-01
draft: false
tags:
- golang
- testing
---

This is the second part of the [A Billion Dollar Go Mistake](/posts/a-billion-dollar-go-mistake) post. 
If you haven't read the first part of the post, I would recommend you to read it first.

In the first part, we saw how to handle the DB transaction at the service level. 
What if we still miss the `Rollback` call? To handle such cases, we could build another layer of safety.

There are two approaches I thought of to handle such cases:

- Using a context
- Server side timeout

## Using a context

We could use a context to cancel the DB transaction if it takes too long. This is a good approach yet, you would 
need to fine-tune the timeout value for the context.

If the timeout is too low, you might end up cancelling the DB transaction too early. 
If the timeout is too high, you might end up waiting for the DB transaction to complete for a long time.

Application Traces could help you to figure out the optimal timeout value. 
Also, load testing an application could help you to figure out the optimal timeout value.

```go
func (s *service) CancelSubscription(ctx context.Context, id uuid.UUID) (*model.Subscription, error) {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    
    tx, err := s.db.BeginTxx(ctx, nil)
    if err != nil {
        return nil, err
    }
	
    defer func() {
        if err != nil {
            tx.Rollback()
        }
    }()
    
    subscription, err := s.fetcher.GetSubscription(ctx, tx, id)
    if err != nil {
        return nil, err
    }

    if subscription.CancelledAt != nil {
        return subscription, nil
    }
	
    subscription.CancelledAt = time.Now()

    err = s.updater.UpdateSubscription(ctx, tx, subscription)
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
In the above code, we are using a context with a timeout of 2 seconds. If the DB transaction is not completed within 2 seconds,
we cancel the operation and return an error. We also pass the context to the repo layer so that we can use the context to cancel any
in-progress operation and revert the changes.

The `defer cancel()` call is important. It ensures that the context gets cancelled if the function returns early.

## Server-side timeout

You set an optimal timeout for the request to complete and if the request is not completed within that time,
you cancel the operation and return an error.
```go

server := &http.Server{
    Addr:         ":8080",
    Handler:      router,
    WriteTimeout: 2 * time.Second,
}

```
In the above code, we are setting a server-side timeout of 2 seconds. If the entire request processing is not completed
within 2 seconds, we cancel the operation and return an error to the client. With this approach, you don't need to create
a timeout context for each request. But, you would still need to fine-tune the timeout value based on the traces and load testing.


## Conclusion
I hope you found this second part of the post useful. Adding a layer of safety is always a good idea, but it comes with a cost.
In this case, I would recommend using the context approach as it is the most flexible approach. You can fine-tune the timeout
value based on the traces and load testing.

Not all applications are HTTP based. Context timeout could also be a good approach for other kinds of applications.
The context in general has a lot of use cases and I would recommend you read more about it.
I would recommend keeping a Server side timeout for HTTP services. And you could avoid adding extra timeout context.

You would be also thinking about the client-side timeout. Those are not reliable enough.
For example, a client could keep the timeout for a long duration and with a high load, the server could
keep the connection open for a long time. This could again lead to the same problem we are trying to solve.
