---
title: Improve Visibility Even While Pair Programming
excerpt: "Three things a developer should do to bring visibility to their work while pair programming"
date: 2023-05-23
draft: false
tags:
  - programming
  - pair-programming
  - productivity
  - tips
---

## What is Pair Programming?

From Wikipedia's definition:

> Pair programming is
> a [software development](https://medium.com/r/?url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FSoftware_development)
> technique in which two programmers work together at one workstation. One, the driver, writes code while the other, the
> observer or navigator,[1] reviews each line of code as it is typed in. The
> two programmers switch roles frequently.

A lot of companies these days are adopting the Pair Programming practice. Some have pioneered the way of working using
Pair Programming like [ThoughtWorks](https://www.thoughtworks.com/) where I used to work before. But, some are new to
this and are slowly getting into
it.

Pairing is challenging when you start in itself. The real challenge becomes when the manager evaluates performance on
the wrong measures. It bothers all the devs in a team. Managers only see one person commit logs in git or one person
assigned to JIRA tasks and thus, accounts for work by only one developer.

In such scenarios, the other developer is not visible to the manager. Managers flag developers as “low-performance” team
members.

Not all managers have this problem. Eg. In ThoughtWorks, managers know that a pair works on a task. They are well aware
of how each person contributes to the complete delivery of the project. But, for the companies where the practices are
being adopted, the managers are not aware of how to measure a developer’s performance. They use the same old metrics
like Git log and Jira Tasks to check how many tasks are being completed by the developers. As such, one dev suffers if
the commits or the tasks are not directly assigned to them while pairing.

This plays badly with the annual reviews too. When the manager shows them that their performance is not meeting the
threshold. This becomes a barrier to pair programming. It certainly creates a picture that pairing is not a good thing
because they are being evaluated on the wrong grounds. Ultimately the entire team give up the practice of Pair
programming.

Git logs and Jira tasks are the wrong metrics to measure a developer’s performance while adopting pair programming.
Managers who are using it should avoid such measuring criteria.

You could also talk to your manager if they are friendly and open to new ideas and new learnings. But, not all managers
are like that. Giving feedback sometimes backfires and you are not on good terms with them.

So what should one do to be visible for the work they are doing while Pairing? From my own experience, there are three
things which I will share with you that would work well in such cases

## 1. Add Pariee in Jira Task

When selecting a task on Jira or any other project management software. Make sure to have an extra attribute of
“Pariee”. Select the person you are paring with you.

This will help when the manager is generating a report on how many tasks each developer is working on. They will have to
calculate the report based on aggregated value of tasks which are directly assigned to you as well as tasks which you
were part of as a Pariee.

![Jira Task with Pariee](/images/improve-visibility-even-while-pair-programming/jira.png)

The above context section of Jira shows a sample task. I have configured my JIRA workflow to have Pairee as another
attribute for the task.

## 2. Git Co-Authored Commit

You could attribute a commit to more than one developer using co-authored commit. Both Github and Gitlab support this
feature. When working as a pair make sure you follow the below commit message format

```bash
  This is your normal commit message
  
  Co-authored-by: Ninad Ingole <myemail@gmail.com>
```

With this, you will see both authors in the commit history on GitHub. It will show the commits done to the repository by
both the developer in their individual GitHub contribution section.

![Git Co-Authored Commit](/images/improve-visibility-even-while-pair-programming/contribution.webp)

For people using tools
like [GitHub Desktop](https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop#write-a-commit-message-and-push-your-changes).
The GUI shows the option to include another author as a contributor eg

![GitHub Desktop Commit](/images/improve-visibility-even-while-pair-programming/add-co-author-commit.webp)

For managers who are doing micro-management. This will be your proof. Proof that you were always pairing and that you
share equal contributions to the tasks.

Also for PR Workflows, the Reviewer is aware of the people involved in the change. This helps to reach out to any one of
the dev for review comments.

## 3. Pair Names in Commit Message

Not all platforms of Version control support co-authored commits. This last piece of advice is for such platforms.
For old commits, having the Pair names in the messages is a quick navigation tool.

I simply like to keep the Pair names in the format [First/Second] in the commit message. This also shows nicely when I
am doing `git log --oneline`

![Git Log with Pair Names](/images/improve-visibility-even-while-pair-programming/gitlog.png)

---

## Conclusion

I hope the practices I shared help you to keep developing pair programming skills. It would also help you to avoid any
problems with your manager.

I haven’t shared the benefits of Pair programming in this post. Advantages like knowledge sharing, quick reviews, proper
planning etc. are a few to list. I would encourage others who are not doing it to try it out.

For any more questions related to pair programming or any problems please reach out to me. I would be happy to help you
in the journey of pair programming 😊
