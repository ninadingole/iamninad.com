---
title: "Github Dependabot Alerts"
date: 2020-08-15
summary: "Security is a major concern for any business or product, and with the increasing number of methodologies and toolkits to easily exploits…"
postImage: https://source.unsplash.com/R4WCbazrD1g/920x460
postImageCredits: Rock'n Roll Monkey | https://unsplash.com/@rocknrollmonkey
postImageSource: Unsplash | https://unsplash.com
tags: 
  - github
  - security
  - nodejs
  - expressjs
---

<p>Security is a major concern for any business or product, and with the increasing number of methodologies and toolkits to easily exploits the applications it becomes a more serious issue that needs to be focused on.</p><p>I liked the definition of <strong>"Vulnerability"</strong> from the Github's documentation:</p><blockquote>A vulnerability is a problem in a project's code that could be exploited to damage the confidentiality, integrity, or availability of the project or other projects that use its code. Vulnerabilities vary in type, severity, and method of attack.<br><br>When your code depends on a package that has a security vulnerability, this vulnerable dependency can cause a range of problems for your project or the people who use it.</blockquote><p>My observation as a developer is when we are developing an internal system or application for any client and if it's not a product we will rarely upgrade the dependencies because most of the time we upgrade those dependencies only to overcome any issue or bugfix.</p><p>Other than internal application or services, If we are working on any products we will keep on upgrading the third-party dependencies frequently but not all of them, only those that we are working on most and your application majorly depend on them, or in case there was a bug with the current version which got fixed in a newer version or some additional functionality is added to the library that will benefit the application.</p><p>However, what happens when the dependency is at risk, how would we get to know about such information? Will you keep a dedicated person to keep track of it 😝? or you will do it only when you get impacted by some serious exploit to your application? or you might have a static code analysis system in place which checks for any vulnerability in the code. However, what about the dependencies even in that case?</p><p>We need some kind of automated way to deal with this issue, and this is the exact issue that Github tried to solve and came up with this cool solution "Dependabot".</p><p>Dependabot will alert you whenever there is a vulnerable dependency found in your Github repository. Dependabot will refer the <a href="https://nvd.nist.gov/">National Vulnerability Database</a>, a combination of machine learning and human review to detect vulnerabilities in public commits on GitHub, Security advisories reported on GitHub, and <a href="https://github.com/FriendsOfPHP/security-advisories">FriendsOfPHP</a>, and will use information from all these multiple sources to alert you.</p><p>As shown below, Dependabot works with a wide range of package managers &amp; support languages that are widely used in the industry. Dependabot is still in beta, however, with future releases, you will see more of the tools support added to Dependabot.</p>

![Supported Package Ecosystem](/images/github-dependabot-alerts/Screenshot-2020-08-08-at-2.18.14-PM.png "Supported Package Ecosystem")

<p>In this post, will see how to enable Dependabot in Github public repo, it's simple and has easy to configure steps.</p><hr><h3 id="let-s-go-">Let's Go:</h3><ol><li>Go to the security tab of the repository, and you will see the below screen, click on the <code>Enable Dependabot alerts</code>.</li></ol>

![Enable Dependabot alerts](/images/github-dependabot-alerts/Screenshot-2020-07-30-at-12.53.57-PM.png "Enable Dependabot alerts")

<p>You will be shown the below screen which has two independent configurations, enable them based on your requirement.</p><ol><li><strong>Dependabot alerts:</strong><br>It will enable the dependabot to only show an alert on the main page when there's any vulnerability found in your repo.</li><li><strong>Dependabot security update: <sup>[1]</sup></strong><br>It will raise a PR for upgrading any vulnerable dependencies to a safer version of those dependencies.</li></ol>

![Configuration screen for dependabot alerts](/images/github-dependabot-alerts/Screenshot-2020-08-03-at-11.00.27-AM.png "Configuration screen for dependabot alerts")

<p>Once you enable the above options, it's all done. It's that easy to have this amazing functionality enabled for your repository.</p><p>In the below screen you can see I got an alert for security risk in one of my repository in ExpressJS project.</p>

![Dependabot alerts for a vulnerable dependency in the repository](/images/github-dependabot-alerts/Screenshot-2020-07-29-at-7.43.45-PM.png "Dependabot alerts for a vulnerable dependency in the repository")

<p>On clicking <code>See Dependabot alert</code>, I found that the mongoose library that I am using is having a security issue with version <code>4.7.5</code>. The details of the alert show me that the remediation is to upgrade the library to version <code>&gt;=5.7.5</code> and as my project is a NodeJS project it shows me how to do that in my <code>package.json</code> file.</p><p>Below is the remediation you can see the details of the security vulnerability, in this case, its allowing attackers to bypass access control 😝</p>

![Details of the Issue](/images/github-dependabot-alerts/Screenshot-2020-07-29-at-7.44.04-PM.png "Details of the Issue")

<p>How to fix this issue now? The details already show how to do it manually, but while enabling dependabot there's the second option that will automatically raise a PR for the version upgrade.</p><p>For this repository, I didn't enable the second option <strong><sup>[1]</sup></strong>. However, there's also another way. Click on <code>Create Dependabot security update</code> button in the above page, and it will start creating a PR for you, this is also a manual approach, and as you can see in the below image you will see a notification generated by the dependabot.</p>

![](/images/github-dependabot-alerts/Screenshot-2020-07-29-at-7.44.26-PM.png)

<p>If you go to the <code>Pull Request</code> section of the repository you would see a Pull-Request being raised by the dependabot with tag <code>dependencies</code> I have seen similar PR's in a lot of open-source repositories. </p>

![Dependabot Pull Request For the Issue](/images/github-dependabot-alerts/Screenshot-2020-07-29-at-7.49.49-PM.png "Dependabot Pull Request For the Issue")

<p>And the same PR reference/link you will see in the security alert details now.</p>

![Pull Request Notification for Security Incident](/images/github-dependabot-alerts/Screenshot-2020-07-29-at-7.49.37-PM.png "Pull Request Notification for Security Incident")

<p>Further drilling down into the details of PR you could see more information about the PR, the PR upgrade the mongoose dependency to version <code>5.9.26</code> which is what was given in the remediation to upgrade to anything <code>&gt;=5.7.5</code>. It also shows that the severity of this issue is <code>moderate</code>. Dependabot categories issue in four such categories you can read more about them <a href="https://www.first.org/cvss/specification-document">here</a>.</p><ul><li>Low</li><li>Moderate</li><li>High</li><li>Critical</li></ul><p>I didn't have any CI setup for this repository. However, if you have a test suite in the repository then this will also run all your test cases to see if this version works or not.</p>

![details of the pull-request](/images/github-dependabot-alerts/Screenshot-2020-07-29-at-7.50.07-PM.png "details of the pull-request")

<p>You can also see a Changelog for the recent changes to the library.</p>

![Changelog for the mongoose library](/images/github-dependabot-alerts/Screenshot-2020-07-30-at-12.56.29-PM.png "Changelog for the mongoose library")

<p>And there are some dependabot action commands as shown below that you can use in your comments to trigger actions like if you want to merge this PR instead of clicking on the merge button you can just comment in the PR <code>@dependabot merge</code> and this will merge the PR. You can squash, close, ignore and do all the below-given actions using comments.</p>

![Dependabot commands](/images/github-dependabot-alerts/Screenshot-2020-07-30-at-12.56.52-PM.png "Dependabot commands")

<p>This is what the diff of the PR shows, the bot just updated a single line in my <code>package.json</code> file.</p>

![Diff for <code>package.json</code>](/images/github-dependabot-alerts/Screenshot-2020-07-30-at-12.57.17-PM.png "Diff for <code>package.json</code>")

<p>Once I merged the PR, this is the file content of my <code>package.json</code> 😀.</p>

![Updated package.json](/images/github-dependabot-alerts/Screenshot-2020-07-29-at-7.50.51-PM.png "Updated package.json")

---

<p>Wow, this will be the easiest thing to configure for the next project and comes with so many benefits. I hope this little blog post helps you to get rid of all those vulnerable dependencies in your project and keeps your business and application safe from some level of security threats. Make sure security is always a priority from the start of your project.</p><p>For any issues while following the steps or with the content do let me know down in the comments or email me using my contact page.</p><p>Don't forget to share the post with your friends &amp; colleagues. Happy Coding!</p>
