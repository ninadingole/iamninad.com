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

We could use a cancel context to release the lock at the end of the transaction. Context is very helpful in many use cases.

Let’s see how to do things with context

```go
func (s *service) CancelSubscription(ctx context.Context, id uuid.UUID) (*model.Subscription, error) {
    ctx, cancel := context.WithCancel(ctx)
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
In the above code, we create a new cancel context from the parent context. 
If the DB transaction is not released either using `Rollback` or `Commit`. 
A `defer cancel()` happens at the end when the call returns.

The cancel call will notify the transaction that the operation is complete. The go runtime will close the transaction.

The `defer cancel()` call is important. If you miss that then the problem will still persist

At the go source code level transaction begin call starts a background go routine. 
The go routine monitors context Done signal. Let's see how it happens using context as shown [here](https://github.com/golang/go/blob/master/src/database/sql/sql.go#L1887)

```go
func (db *DB) beginDC(ctx context.Context, dc *driverConn, release func(error), opts *TxOptions) (tx *Tx, err error) {
     var txi driver.Tx
     keepConnOnRollback := false
     withLock(dc, func() {
      _, hasSessionResetter := dc.ci.(driver.SessionResetter)
      _, hasConnectionValidator := dc.ci.(driver.Validator)
      keepConnOnRollback = hasSessionResetter && hasConnectionValidator
      txi, err = ctxDriverBegin(ctx, opts, dc.ci)
     })
     if err != nil {
      release(err)
      return nil, err
     }

     ctx, cancel := context.WithCancel(ctx)
     tx = &Tx{
      db:                 db,
      dc:                 dc,
      releaseConn:        release,
      txi:                txi,
      cancel:             cancel,
      keepConnOnRollback: keepConnOnRollback,
      ctx:                ctx,
     }
     go tx.awaitDone() // GO WAITS FOR THE CONTEXT TO DONE
     return tx, nil
}
```

And inside the tx.awaitDone

```go
  func (tx *Tx) awaitDone() {
   // Wait for either the transaction to be committed or rolled
   // back, or for the associated context to be closed.
   <-tx.ctx.Done()
  
   // Discard and close the connection used to ensure the
   // transaction is closed and the resources are released.  This
   // rollback does nothing if the transaction has already been
   // committed or rolled back.
   // Do not discard the connection if the connection knows
   // how to reset the session.
   discardConnection := !tx.keepConnOnRollback
   tx.rollback(discardConnection)  // AT THE END THE TX WILL BE ROLLBACKED
  }
```

So transactions with a cancel context make more sense. Do not use the context coming from the HTTP request. 
HTTP context works like a client-side timeout. The service layer has no control over cancelling the HTTP context.

A timeout context could also work but that will not be that reliable. Finding the right timeout value is a difficult task in itself.

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
In this case, I would recommend using the context approach along with the `defer tx.Rollback()` after initiating the transaction.

Cancel context is the best approach for most application types. 
And would serve most of the cases. The context in general has a lot of use cases and I would recommend you read more about it.

Also, for an extra layer of safety, I would recommend keeping a Server side timeout for HTTP services.

You would be also thinking about the client-side timeout. 
Those are not reliable enough. For example, a client could keep the timeout for a long duration and with a high load,
the server could keep the connection open for a long time. This could again lead to the same problem we are trying to solve.
