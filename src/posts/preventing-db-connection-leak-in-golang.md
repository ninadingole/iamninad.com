---
title: Preventing DB Connection Leaks in Golang
excerpt: This post is about why we need a separate transaction layer? How to extract it, and test it using Unit and Integration Test.
date: 2023-04-01
draft: false
## If your image is within the project start the url with `./src/images/`

tags:
  - golang
  - testing
  - integration-test
---

## Introduction

In my previous blog post, ["A Billion Dollar Go Mistake"][previous-blog-link].
I discussed a common but naive mistake that developers make in Golang, which can lead to connection leaks.
Although I offered several ways to fix this problem, one issue still bothered both myself and my readers.
We can solve this problem by abstracting the transaction mechanism into a different layer.
Many people reached out to me to suggest this solution.

So, my first curiosity question I want to reason:

> ## Do we really need a Transaction layer?

I read several other blogs and GitHub codes. I noticed that many of them were great but did not include tests to prove
that the abstraction layer works. But, we cannot confirm that the transaction layer works without tests. A connection
leak may occur, and we cannot detect it by examining the code.

This led me to another important question:

> ## How can I prove that the new layer have no connection leask?

Testing is the only way to verify whether something works as expected.
I decided to start with two straightforward options that came to my mind:

1 - I will run some queries that change the table and verify that the code commits the data to the database.
2 - I will some mechanisms that expose the connection information. I could verify that the code closes the connections at
the end.

The first approach is simple, and I have used it many times in my projects 😅. But, the second approach is completely
unknown to me 👾. When I face difficulties in understanding how things work, I usually look at the source code of the
language.

To resolve my problem, I looked for help in the standard database library code of Golang.
I found something that could help me: the `DBStats` struct.

```go
// DBStats contains database statistics.
type DBStats struct {
  MaxOpenConnections int // Maximum number of open connections to the database.
  
  // Pool Status
  OpenConnections int // The number of established connections both in use and idle.
  InUse           int // The number of connections currently in use.
  Idle            int // The number of idle connections.
  
  // Counters
  WaitCount         int64         // The total number of connections waited for.
  WaitDuration      time.Duration // The total time blocked waiting for a new connection.
  MaxIdleClosed     int64 // The total number of connections closed due to SetMaxIdleConns.
  MaxIdleTimeClosed int64 // The total number of connections closed due to SetConnMaxIdleTime.
  MaxLifetimeClosed int64 // The total number of connections closed due to SetConnMaxLifetime.
}
```

This is precisely the solution I was searching for. Upon completion of the transaction, the `MaxOpenConnections`
and `InUse` counts should be `0`.
If this is not the case, it indicates a potential leak in the abstraction layer.

I am thrilled to have found the ideal solution to address the second scenario 🎉

To access the `DBStats`, we can use the `Stats()` method on the `sql.DB` instance, as shown below:

```go
db, _ := sqlx.Open("postgres", "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable")
db.Stats()
```

The source code for the `Stats()` method is below. You can read more about it's working and how go code records the
information by following the source code [here][db-source-code]

```go
// Stats returns database statistics.
func (db *DB) Stats() DBStats {
  wait := db.waitDuration.Load()
  
  db.mu.Lock()
  defer db.mu.Unlock()
  
  stats := DBStats{
    MaxOpenConnections: db.maxOpen,
    
    Idle:            len(db.freeConn),
    OpenConnections: db.numOpen,
    InUse:           db.numOpen - len(db.freeConn),
    
    WaitCount:         db.waitCount,
    WaitDuration:      time.Duration(wait),
    MaxIdleClosed:     db.maxIdleClosed,
    MaxIdleTimeClosed: db.maxIdleTimeClosed,
    MaxLifetimeClosed: db.maxLifetimeClosed,
  }
  
  return stats
}
```

All this is enough for me to implement the Transaction Layer. So, Let's delve into the code now. But before we get started, let me introduce you to some of the libraries that I will be
using in the code:

- [Sqlx](https://github.com/jmoiron/sqlx)
- [dockertest](https://github.com/ory/dockertest)
- [testify](https://github.com/stretchr/testify)
- [go-sqlmock](https://github.com/DATA-DOG/go-sqlmock)

<br />

> ## Interestingly, it's hard to reproduce the connection leak scenario in a transaction layer. Trust me, I've tried and failed. 😂

I'll show how to test the old code using `DBStats` assertions. With this example, people who will not abstract 
the transaction layer could update their tests to avoid any connection leaks. 
Later on, we'll explore how to extract the transaction layer and test it.

```go
package apptest

import (
  "context"
  "database/sql"
  "github.com/jmoiron/sqlx"
)

type Subscription struct {
  ID         int64        `db:"id"`
  Status     string       `db:"status"`
  CanceledAt sql.NullTime `db:"canceled_at"`
}

// ------------------------------ Repository ------------------------------

type srepo struct {
}

// GetSubscription fetches the subscription by id
func (r *srepo) GetSubscription(tx *sqlx.Tx, id int64) (Subscription, error) {
  var sub Subscription
  err := tx.Get(&sub, "SELECT * FROM subscription WHERE id = $1", id)
  if err != nil {
    return sub, err
  }

  return sub, nil
}

// CancelSubscription cancels a given subscription by setting canceled_at to now()
func (r *srepo) CancelSubscription(tx *sqlx.Tx, id int64) (Subscription, error) {
  var sub Subscription
  err := tx.Get(&sub, "UPDATE subscription SET canceled_at = NOW(), status='canceled' WHERE id = $1 RETURNING *", id)
  if err != nil {
    return sub, err
  }

  return sub, nil
}

// ------------------------------ Service ------------------------------

type Service struct {
  db   *sqlx.DB
  repo *srepo
}

func NewService(db *sqlx.DB, repo *srepo) *Service {
  return &Service{repo: repo, db: db}
}

func (s *Service) CancelSubscription(ctx context.Context, id int64) (*Subscription, error) {
  tx, err := s.db.BeginTxx(ctx, nil)
  if err != nil {
    return nil, err
  }

  defer func() {
    // !!! This would not work if the subscriptions is already canceled 
    // and the error is not returned
    if err != nil {
      _ = tx.Rollback()
      return
    }
  }()

  sub, err := s.repo.GetSubscription(tx, id)
  if err != nil {
    return nil, err
  }

  if sub.Status != "active" {
    return &sub, nil
  }

  if sub.CanceledAt.Valid {
    return &sub, nil
  }

  sub, err = s.repo.CancelSubscription(tx, id)
  if err != nil {
    return nil, err
  }

  err = tx.Commit()

  return &sub, err
}
```

## What's wrong with the above code?

When the subscription is already cancelled it will return without error.
When the function returns without error the connection is neither rollback nor commits.
This causes the connection leak.

Below is the integration test to see how we can catch the leak.

```go
func Test_ConnectionLeak(t *testing.T) {
  pg, err := apptest.StartTestPostgres(t) // Please use the source code to learn more about this code
  require.NoError(t, err)
  
  _, err = pg.DB.Exec("CREATE TABLE IF NOT EXISTS subscription (id serial PRIMARY KEY, status varchar(25) NOT NULL, canceled_at timestamp NULL)")
  require.NoError(t, err)
  
  _, err = pg.DB.Exec("INSERT INTO subscription (status, canceled_at) VALUES ('active', NULL)")
  require.NoError(t, err)
  
  _, err = pg.DB.Exec("INSERT INTO subscription (status, canceled_at) VALUES ('canceled', '2023-02-02 01:00:00')")
  require.NoError(t, err)
  
  subscription, err := NewService(pg.DB, &srepo{}).CancelSubscription(context.Background(), 2)
  require.NoError(t, err)
  
  stats := pg.DB.Stats()
  require.Equal(t, 0, stats.InUse, "expected no connections in use")
  require.Equal(t, 0, stats.MaxOpenConnections, "expected no max open connection")
  
  require.Equal(t, "canceled", subscription.Status)
  require.Equal(t, "2023-02-02 01:00:00 +0000 +0000", subscription.CanceledAt.Time.String())
}
```

I am using an integration test here. I connect to a Postgres DB instance in docker and run the test.
From the test result below you could see that the code has a transaction problem. The actual count `InUse` is `1`.
The connection is not closed at the end of the function call. This is what we will solve using the transaction
abstraction layer in the next section.

```bash
=== RUN   Test_ConnectionLeak
    service-connection-leak_test.go:27: 
         Error Trace: /pkg/service-connection-leak_test.go:27
         Error:       Not equal: 
                      expected: 0
                      actual  : 1
         Test:        Test_ConnectionLeak
         Messages:    expected no connections in use
--- FAIL: Test_ConnectionLeak (6.69s)

Expected :0
Actual   :1
<Click to see difference>

FAIL
```

## Extracting the Transaction Layer

To address the connection leak issue, one way could be to fix what is failing. Close the connection by manually testing 
the service and then reviewing the code. But that same issue could creep in again in future. 
The right way is to extract a transaction layer. 
The idea behind this extraction is simple: we provide a public method

```go
func InTx(ctx context.Context, db *sqlx.DB, txFunc func (*TxWrap) error) (err error)
```

which accepts the transaction-based business logic in the `txFunc` parameter.

With this approach, the developer no longer has to manually handle transactions, as the `InTx` method abstracts the
transaction mechanism away from the business logic.
By passing the `txFunc` parameter to `InTx`, the developer can focus on the actual business operations, without worrying 
about the underlying transaction management.

> I am keeping the code simple and avoiding any complications for blogging purposes.

```go
package db

import (
  "context"
  "database/sql"
  "github.com/jmoiron/sqlx"
)

// TxWrap is a wrapper around sqlx.Tx that adds a context
// and redirects calls to methods like Get, Select to GetContext and SelectContext
// with the context it wraps.
type TxWrap struct {
  tx  *sqlx.Tx        // underlying transaction
  ctx context.Context // context to use for all calls
}

// Get is a wrapper around sqlx.Tx.GetContext
// that uses the context it wraps.
func (tx *TxWrap) Get(dest interface{}, query string, args ...interface{}) error {
  return tx.tx.GetContext(tx.ctx, dest, query, args...)
}

// Select is a wrapper around sqlx.Tx.SelectContext
// that uses the context it wraps.
func (tx *TxWrap) Select(dest interface{}, query string, args ...interface{}) error {
  return tx.tx.SelectContext(tx.ctx, dest, query, args...)
}

// IMPLEMENT OTHER RELATED sqlx Methods to use wrapped context

// InTx executes a function in a transaction.
// If the function returns an error, the transaction is rolled back.
// If the function panics, the transaction is rolled back and the panic is re-raised.
// If the function returns nil, the transaction is committed.
func InTx(ctx context.Context, db *sqlx.DB, txFunc func(*TxWrap) error) (err error) {
  ctx, cancel := context.WithCancel(ctx)
  defer cancel()

  tx, err := db.BeginTxx(ctx, nil)
  if err != nil {
    return err
  }

  txWrap := &TxWrap{
    tx:  tx,
    ctx: ctx,
  }

  defer func() {
    if p := recover(); p != nil {
      _ = txWrap.tx.Rollback()
      panic(p)
    }
    if err != nil {
      _ = txWrap.tx.Rollback()
      return
    }
    err = txWrap.tx.Commit()
  }()

  return txFunc(txWrap)
}
```

The `InTx` wraps around the actual sqlx.Tx in `TxWrap` struct and encapsulates the transaction management logic within
the method. The `InTx` takes care of calling `Begin, Commit and Rollback`.

The `TxWrap` struct also contains a derived cancel context (`ctx`), which was discussed in my previous post to ensure
the context cancellation happens at the end of the method call. 
Inside the `InTx` method, we have a `defer` block that handles three possible outcomes of the transaction
logic:

1 - Panic: In case of any unhandled exception, the transaction will automatically roll back.
2 - Error: If any error occurs during the transaction, it will also be rolled back.
3 - Success: If everything goes as expected, the transaction will be committed.

To provide further safety, we also implement the same `Get` and `Select` functions as in the sqlx library, but we proxy
the
calls to the context version of these functions. This ensures that any in-process requests are cancelled if the context
is cancelled, if a client cancels an HTTP request.

Now the real excitement begins !!! TESTS !!! 🚀 🥹

<img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzRjZjc2YzAxNWNhYzE0ODdlNjQ1MzNlZjg4MzkxNTRjMWJjMDgwNCZjdD1n/MNmyTin5qt5LSXirxd/giphy.gif" height="70%"
  style="margin: 0 auto; display: block;"
/>

I am doing both approaches, the Unit test and the Integration Test. It is up to you what you want to use. My own
preference is the Integration test. They mimic behaviour close to real infrastructure.

### Unit Test

For the unit test, I am using `sqlmock`. I set up the expectation as per the 3 behaviours of our code and assert if the
expectations are met. I also check the connection count resets `0` at the end. Unit Tests are pretty fast so we are also
doing `t.Parallel` and initiating a new sqlmock for every test.

```go
// ------------------------------ UNIT Test ------------------------------
func Test_Unit(t *testing.T) {
	t.Parallel()
	
  tests := []struct {
    name      string
    fn        func (tx *TxWrap) error
    setup     func (mock sqlmock.Sqlmock)
    wantErr   bool
    wantPanic bool
  }{
    {
      name: "success path",
      fn: func (tx *TxWrap) error {
          return nil
      },
      setup: func (mock sqlmock.Sqlmock) {
        mock.ExpectBegin()
        mock.ExpectCommit()
      },
    },
    {
      name: "failure path",
      fn: func (tx *TxWrap) error {
          return errors.New("some error")
      },
      setup: func (mock sqlmock.Sqlmock) {
        mock.ExpectBegin()
        mock.ExpectRollback()
      },
      wantErr: true,
    },
    {
      name: "panic",
      fn: func (tx *TxWrap) error {
        panic("some panic")
        return nil
      },
      setup: func (mock sqlmock.Sqlmock) {
        mock.ExpectBegin()
        mock.ExpectRollback()
      },
      wantPanic: true,
    },
  }
  for _, test := range tests {
    test := test
    t.Run(test.name, func (t *testing.T) {
      t.Parallel()
      
      db, mock, err := sqlmock.New()
      require.NoError(t, err)
      
      dbx := sqlx.NewDb(db, "sqlmock")
      
	    if test.setup != nil {
        test.setup(mock)
      }
      
      // Only add this defer when we expect panic to take over the 
      // panic recovery and see if there is a valid error
      if test.wantPanic {
        defer func () {
            require.NotNil(t, recover())
        }()
      }
      
      err = InTx(context.Background(), dbx, test.fn)
      
      require.Equal(t, test.wantErr, err != nil)
      require.NoError(t, mock.ExpectationsWereMet())
      
      stats := dbx.Stats()
      require.Equal(t, 0, stats.InUse)
      require.Equal(t, 0, stats.MaxOpenConnections)
    })
  }
}
```

### Integration Test

For the Integration test below, I am using Postgres DB. I create a dummy `Employees` table first. Then I execute some
inserts and selects statements for different scenario. In the end, check if the layer closes the connection for every
test.

A point to note here is that I am not doing `t.Parallel`. The shared connection between tests in the parallel run would
be a problem. The `InUse` and `MaxOpenConnections` will never be `0`. 
It is up to you how you want to do it. You can do a similar thing we did in the Unit test to create a 
**separate connection** for every test:

```go
// ---------------------------------- INTEGRATION TEST -------------------------------------
type Employee struct {
  ID   int64  `db:"id"`
  Name string `db:"name"`
}

func Test_Integration(t *testing.T) {
  pg, err := apptest.StartTestPostgres(t)
  require.NoError(t, err)

  _, err = pg.DB.Exec("CREATE TABLE IF NOT EXISTS employee (id serial PRIMARY KEY, name varchar(25) NOT NULL)")
  require.NoError(t, err)

  tests := []struct {
    name      string
    txfunc    func (tx *TxWrap) error
    wantErr   bool
    wantPanic bool
  }{
    {
      name: "success path",
      txfunc: func (tx *TxWrap) error {
        _, err := tx.Exec("INSERT INTO employee (name) VALUES ('John Doe')")
        return err
      },
    },
    {
      name: "failure path",
      txfunc: func (tx *TxWrap) error {
        var employee Employee
        err := tx.Get(&employee, "SELECT * FROM employee WHERE id = $1", 100)
        return err
      },
      wantErr: true,
    },
    {
      name: "panic",
      txfunc: func (tx *TxWrap) error {
        panic("some panic")
        
        return nil
      },
      wantPanic: true,
    },
  }
  for _, test := range tests {
    test := test
    t.Run(test.name, func (t *testing.T) {
      // Wrap the function in a defer to catch panics
      // and assert that the panic is not nil.
      defer func () {
        if test.wantPanic {
          require.NotNil(t, recover())
        }
        stats := pg.DB.Stats()
        require.Equal(t, 0, stats.InUse)
        require.Equal(t, 0, stats.MaxOpenConnections)
      }()
      
      err = InTx(context.Background(), pg.DB, test.txfunc)
      
      require.Equal(t, test.wantErr, err != nil)
    })
  }
}
```

## Updating the Service

We have the new transaction layer ready. Let's change our old code to use this new layer.

```go
// ------------------------------ Repository ------------------------------

type txRepo struct {
}

// GetSubscription is a repository method that does not leak connections
// it uses *TxWrap to wrap the transaction
// it uses the context to cancel the transaction if the context is canceled
// but the context is inside the *TxWrap and not exposed to the service
func (r *txRepo) GetSubscription(tx *db.TxWrap, id int64) (Subscription, error) {
  var sub Subscription
  err := tx.Get(&sub, "SELECT * FROM subscription WHERE id = $1", id)
  if err != nil {
    return sub, err
  }
  
  return sub, nil
}

func (r *txRepo) CancelSubscription(tx *db.TxWrap, id int64) (Subscription, error) {
  var sub Subscription
  err := tx.Get(&sub, "UPDATE subscription SET canceled_at = NOW(), status='canceled' WHERE id = $1 RETURNING *", id)
  if err != nil {
    return sub, err
  }
  
  return sub, nil
}

// ------------------------------ Service ------------------------------

type txService struct {
  db   *sqlx.DB
  repo *txRepo
}

// CancelSubscriptionWithoutLeak is a service method that does not leak connections
// it uses InTx helper to wrap the transaction
func (s *txService) CancelSubscriptionWithoutLeak(ctx context.Context, id int64) (*Subscription, error) {
  var sub Subscription
  var err error
  
  // So cool!!!!!!!! 🎸
  err = db.InTx(ctx, s.db, func (tx *db.TxWrap) error {
    sub, err = s.repo.GetSubscription(tx, id)
    if err != nil {
      return err
    }
    
    if sub.Status != "active" {
      return nil
    }
    
    if sub.CanceledAt.Valid {
      return nil
    }
    
    sub, err = s.repo.CancelSubscription(tx, id)
    if err != nil {
      return err
    }
    
    return nil
  })
  
  return &sub, err
}
```

The Test:

```go
func Test_NoConnectionLeak(t *testing.T) {
  pg, err := apptest.StartTestPostgres(t)
  require.NoError(t, err)
  
  _, err = pg.DB.Exec("CREATE TABLE IF NOT EXISTS subscription (id serial PRIMARY KEY, status varchar(25) NOT NULL, canceled_at timestamp NULL)")
  require.NoError(t, err)
  
  _, err = pg.DB.Exec("INSERT INTO subscription (status, canceled_at) VALUES ('active', NULL)")
  require.NoError(t, err)
  
  _, err = pg.DB.Exec("INSERT INTO subscription (status, canceled_at) VALUES ('canceled', '2023-02-02 01:00:00')")
  require.NoError(t, err)
  
  subscription, err := NewTxService(pg.DB, &txRepo{}).CancelSubscriptionWithoutLeak(context.Background(), 2)
  require.NoError(t, err)
  
  stats := pg.DB.Stats()
  require.Equal(t, 0, stats.InUse, "expected no connections in use")
  require.Equal(t, 0, stats.MaxOpenConnections, "expected no max open connection")
  
  require.Equal(t, "canceled", subscription.Status)
  require.Equal(t, "2023-02-02 01:00:00 +0000 +0000", subscription.CanceledAt.Time.String())
}

-------------

== = RUN   Test_NoConnectionLeak
--- PASS: Test_NoConnectionLeak (5.61s)
PASS
```

The test above is the exact test we used in our connection leak example. I have to tweak it for the new service and new
imports. Everything else in the test is the same.

You could see when we changed the service to use the new transaction layer our same test is green. 🥳🥳🥳

## Do We Really Need A Transaction Layer?

It was tough for me to create a connection leak with the transaction layer in the old code. It is close to impossible
that anything could go wrong.

Although, I felt that testing would be a challenge. The `DBStruct` provided an easy way for testing.

With different business operations within a transaction, a single line could cause problems and issues in production.
But a separate battle-tested layer would safeguard against any issues. Plus, the same layer could be shared with
different flows to avoid code repetition.

So, if you haven't yet extracted that transaction logic please do! You could write your own library or use something off
the shelf. I am also going to publish the lib on my GitHub which I would share with you 🚀

{% Gif "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGVjYmY5Y2U1OWJlOTE1MjQzNDNkM2Q1MjA3MzA1ODcwMjRhODFlMSZjdD1n/yBwgX64KAPrHW2ltZ2/giphy.gif" %}

## Conclusion

With this proof, I am very confident that I will not cause another transaction-related production issue. And I hope this
blog post helps you to learn something new about Golang.

Some of my initial assumptions were proven wrong. The tests
could allow me to answer that the layer works and there will be no connection leak.

---

[previous-blog-link]: https://www.iamninad.com/posts/a-billion-dollar-go-mistake/

[db-source-code]: https://github.com/golang/go/blob/master/src/database/sql/sql.go#L1155
