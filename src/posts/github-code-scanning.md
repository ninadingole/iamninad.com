---
title: Github Code Scanning
date: 2020-07-26
draft: false
summary: "Bad guys can't get in if they don't have a way. Github Code Scanning tools helps to find out any vulnerabilities or error in the code, that could provide potential access to application or causing runtime errors resulting in serious impact & million dollar loss to the business."
publications: https://medium.com/technogise/github-code-scanning-5cc2c7f9f0e7
tags:
  - github
  - security
  - tools
  - github code scanning
---

<p>Have you ever done code scanning of your code for vulnerabilities or code error before? No? Don't worry even I wasn't aware of the same when I started my career as a developer. Many organization do follow this as a best practice and a must before moving the application to production. This helps to mitigate any security vulnerabilities or error in the application after it is deployed to production avoiding any business impact or monitory losses.</p><p>There are many code scanning tools available some are proprietary licensed products, and some are a free tool, and it requires some efforts to set up with your existing CI/CD setup. The one which I have seen is <a href="https://www.veracode.com/">Veracode</a>, which is a proprietary product and provides information about any security risk or code error by scanning the entire code base, even the dependencies I believe, and then there is <a href="https://www.sonarqube.org/">SonarQube</a> widely used by many organization and many of you might be aware of, it's a static code analyser and provides information regarding any security risk or code error.</p><p>Github, which is the most popular platform for open source development came up with a new service that allows code scanning of the repository for security vulnerabilities and any coding errors. You can use code scanning to find, triage, and prioritise fixes for existing problems in your code. Code scanning also prevents developers from introducing new problems. You can schedule scans for specific days and times, or trigger scans when a specific event occurs in the repository, such as a push.</p><p>If code scanning finds a potential vulnerability or error in your code, GitHub displays an alert in the repository. After you fix the code that triggered the alert, GitHub closes the alert. Code Scanning is a new service and is still in beta and lots of scanning rules are work in progress like passwords leaked in java properties file is still not available, however as the service becomes more stable will have all such cases available in CodeQL rules database.</p><p>By default, code scanning uses CodeQL, a semantic code analysis engine. CodeQL treats code as data, allowing you to find potential vulnerabilities in your code with greater confidence than traditional static analyzers. You can use CodeQL to find all variants of vulnerability, and remove all the variants from your code.</p><p>QL is the query language that powers CodeQL. QL is an object-oriented logic programming language. GitHub, language experts, and security researchers create the queries used for code scanning, and the queries are open source. The community maintains and updates the queries to improve analysis and reduce false positives. For more information, see <a href="https://securitylab.github.com/tools/codeql">CodeQL</a> on the GitHub Security Lab website.</p><p>In this short tutorial, will see how to configure code scanning for a Java-based project. Code scanning supports both compiled and interpreted languages and can find vulnerabilities and errors in code that's written in the supported languages.</p><ul><li>C/C++</li><li>C#</li><li>Go</li><li>Java</li><li>JavaScript/TypeScript</li><li>Python</li></ul><p></p><blockquote>Github Code Scanning is still in beta and access is limited to users on an invitation basis, follow the below steps when you have access to the service</blockquote><h2 id="code-scannning-vs-sonarqube">Code Scannning vs SonarQube</h2><p>I am seeing a lot of people looking for this comparison. Code scanning is a new tool which currently using CodeQL under the hood to scanning code for any security vulnerability. It's new but a lot of security researchers are sharing the findings in CodeQL repo, so you will have your code check against those latest findings. Code Scanning deals more with the Security and coding errors not the static code check analysis what SonarQube provides for every supported language.</p><p>SonarQube is used by many organization it has comprehensive set of checks and standards that acts as a quality gate in application development.</p><p>SonarQube is very mature product as compared to code scanning, code scanning is new but you never know what the future holds for it.</p><hr><h3 id="let-s-start-">Let's start 🏃🏻‍♂️</h3><p>The first thing you need to do is navigate to the security tab of the repository</p>

![Security Tab In Main Section](/images/github-code-scanning/Screenshot-2020-07-25-at-1.29.00-PM.png "Security Tab In Main Section")

<p>Then you will see a below screen, and the last option you will see "Code Scanning alerts", click on the <code>Setup code scanning</code> button</p>

![Security Options](/images/github-code-scanning/Screenshot-2020-07-22-at-1.17.57-PM.png "Security Options")

![Security Scanning Setup](/images/github-code-scanning/Screenshot-2020-07-22-at-1.18.14-PM.png "Security Scanning Setup")

<p>Code scanning uses Github Actions, You will see the above screen for CodeQL analysis setup, along with this you will also see many different options from marketplace to setup like "Anchore Container Scan", "OSSAR" etc. For this post will be going with the default action workflow, click on the setup this workflow button for CodeQL analysis, and you will be prompted with the below screen to configure the workflow YAML.</p>

![CodeQL Workflow setup screen](/images/github-code-scanning/Screenshot-2020-07-22-at-1.19.22-PM.png "CodeQL Workflow setup screen")

<p>When you see the configuration click on the <code>Start commit</code> and create a commit with the basic configuration will do the modification afterwards.</p>

![Commit Dialog](/images/github-code-scanning/Screenshot-2020-07-22-at-1.19.35-PM.png "Commit Dialog")

![Committed CodeQL anaylsis file](/images/github-code-scanning/Screenshot-2020-07-22-at-1.19.50-PM.png "Committed CodeQL anaylsis file")

<p>Take a pull in your repository so that you have the workflow YAML available to modify. Open the file in <code>.github/workflow</code> directory and modify the configuration as per your requirement, below are the configuration that I have done for this post.</p><!--kg-card-begin: html--><script src="https://gist.github.com/ninadingole/a6087db34a60cb6e0b0e221aeb389287.js"></script><!--kg-card-end: html--><p>Few things I modified from the given workflow like I have disabled the cron scheduled option, this makes the security scan to run on given cron expression, the option <code>push</code> enables the scan to run on every commit push to the remote, and the similar <code>pull_request</code> will happen for every pull request, however in an attempt when I ran a full pack of security rule that took 19min. </p><p>In such case, I would recommend setting up the Security scanning as a cron once in a day mostly a nightly build so that your team will get to see the result of the security scan as the first thing at the start of the day and can prioritise fixing the bugs first. Another change I have done is adding configuration to Initialize CodeQL step as below in file <code>.github/codeql-config.yml</code></p><!--kg-card-begin: html--><script src="https://gist.github.com/ninadingole/b3221e3ad553521af84317957d14e618.js"></script><!--kg-card-end: html--><p>The CodeQL actions <code>codeql-action/init@v1</code> can find the programming language by its auto-detection feature, it is something that is embedded in the action by Github developers, however, I have explicitly added java so that the step doesn't have to do extra work and saves time, and at the same time I like to make things readable instead of the abstraction magic, this helps anyone new joining your team figure out how things are configured.</p><p>Then there are <code>queries</code> options, this allows to specify additional scan rules, two are inbuilt in the CodeQL tool which I have specified <code>security-extended</code> and <code>security-and-quality</code> however there are also many additional security rules on the Github's CodeQL repo, you can find it <a href="https://github.com/github/codeql">here</a> when I first added the entire repo which was more than 800 rules, it took more time and many of them were not of any use for my experiment purpose so I selected a subset of those.</p><p>There is a syntactic way to provide the configuration as shown below, to make the custom queries to run you need to disable the default queries by setting <code>disable-default-queries: true</code>.</p><figure class="kg-card kg-code-card"><pre class="language-yaml"><code class="language-yaml">queries:
  - name: Use an in-repository QL pack (run queries in the my-queries directory)
    uses: ./my-queries
  - name: Use an external JavaScript QL pack (run queries from an external repo)
    uses: octo-org/javascript-qlpack@master
  - name: Use an external query (run a single query from an external QL pack)
    uses: octo-org/python-qlpack/show_ifs.ql@master
  - name: Use a query suite file (run queries from a query suite in this repo)
    uses: ./codeql-qlpacks/complex-python-qlpack/rootAndBar.qls</code></pre><figcaption>Different ways to provide custom CodeQL queries</figcaption></figure><p>In the configurations, I have provided <code>github/codeql/java/ql/src/codeql-suites/java-code-scanning.qls@v1.24.0</code> this is the path to the actual GitHub <a href="https://github.com/github/codeql/tree/master/java/ql/src/codeql-suites">link</a> and I have tagged the rules for version <code>1.24.0</code> you can also point to the <code>master</code> as shown in the above configuration guide.</p><p>After you have done the configuration create a new commit, and push. You will see a new scan action triggered which you can view in the Actions section of the <a href="https://github.com/ninadingole/github-codescan/actions">Github repo page</a>.</p>
    
  ![All Actions](/images/github-code-scanning/Screenshot-2020-07-25-at-8.38.27-PM.png "All Actions")
    
  <p>Clicking on the individual action run will show you additional information about the scan process, in the log which is provided for the step navigate to the <code>Perform CodeQL Analysis</code> section and you can see what all security rules that were checked against the code.</p>
  
  ![Log for Action Workflow](/images/github-code-scanning/Screenshot-2020-07-22-at-1.23.45-PM.png "Log for Action Workflow")
  
  <p>Once the workflow is completed without any error, to check any security vulnerability or error in the code navigate to the Security Tab, the badge also shows the number of security risk that is present in the code, I liked this as the information is right there available on the main page of your repo and this way team can prioritise bugs to be fixed.</p>
  
  ![Total number of Security risk found](/images/github-code-scanning/Screenshot-2020-07-22-at-4.03.15-PM.png "Total number of Security risk found")

  <p>If you click on it and move to the code scanning alerts you can see all the vulnerabilities that are available in the code listed</p>
  
  ![Listing of all the risks](/images/github-code-scanning/Screenshot-2020-07-26-at-6.09.15-PM-1.png "Listing of all the risks")
  
  <p>The listing shows the message of the issue found, the file in which the issue was detected with the line number (very cool) and the branch in which the issue was found. Further clicking on any issue you can drill down into the actual code, the UI will highlight the line of code which has the issue, whether its a warning or an actual error and more details like the commit that caused the issue, the rule that failed and tags the issues based on the rules category. In the below image you can see the error are tagged as <code>CWE-798</code> and <code>security</code></p><p>You can see the details of two errors which are a security risk to my code are listed below(deliberately added for demo purpose 😛). One is because of the password leaked into the source code and the other is directly redirecting to the user-provided URL without first validating the URL.</p>
  
  ![Password in source code](/images/github-code-scanning/Screenshot-2020-07-26-at-6.08.11-PM.png "Password in source code")
  
  ![URL redirection without validation](/images/github-code-scanning/Screenshot-2020-07-26-at-6.07.41-PM.png "URL redirection without validation")
  
  
  <p>If you click on the small show more button you can see a good help about the issue and how to avoid it, there are also links to some reference documentation that explains the issue in depth.</p>
  
  ![Recommendation for the cause of the issue](/images/github-code-scanning/Screenshot-2020-07-26-at-6.08.28-PM.png "Recommendation for the cause of the issue")

  <p>Once you have fixed the issue and the code is pushed the issue will be moved to close. However, at times there will be cases of false-positive in such cases there is an option provided at the top right of the issue, to manually close the issue, and has three options showing in below image, select one that suits your use case and close the issues which are not valid.</p>
  
  ![Options to close issue](/images/github-code-scanning/Screenshot-2020-07-25-at-9.58.48-PM.png "Options to close issue")
  
  ---

  <p><strong>EDIT:</strong></p><p>I was reading some blogs on Github and found this exciting stats:</p><p>Since introducing the beta in May, we’ve seen tremendous adoption within the community:</p><ul><li>We’ve scanned over 12,000 repositories 1.4 million times, and found more than 20,000 security issues including remote code execution (RCE), SQL injection, and cross site scripting (XSS) vulnerabilities.</li><li>Developers and maintainers fixed 72% of reported security errors identified in their pull requests before merging in the last 30 days. We’re proud to see this impact, given industry data shows that <a href="https://www.veracode.com/state-of-software-security-report">less than 30%</a> of all flaws are fixed one month after discovery.</li><li>We’ve had 132 community contributions to CodeQL’s open sourced query set.</li><li>We’ve partnered with more than a dozen open source and commercial security vendors to allow developers to run CodeQL and industry leading solutions for SAST, container scanning, and infrastructure as code validation side-by-side in GitHub’s native code scanning experience.</li></ul><hr><p>I hope this post helps you, if you don't see the option to enable the security scan on your repository, don't worry the tool is still in beta and access is given on invitation basis by Github. Get an invite for the service if you want to try out and It will be accessible to everyone soon.</p><p>The post gives a basic idea of how the scanning will work with repository there are many open-source tools, and their workflows available in the Github marketplace that you can try, however, this post will help you to get started with basic.</p><p>For more advance on how different tools can be integrated, what if I work at an organization who has its own set of security rules, how to implement that in CodeQL? I will write about those advance things in another post, and as I explore more of the code scanning tool I will keep on sharing.</p><p>For any issue while following the steps please do let me know in the comments below I will try to correct. For anything else please comment and I will try to reply as soon as possible, and please don't forget to share the post.</p><p>Happy Coding!</p>
  
  ---

  ## References:
  
  - [Github CodeQL](https://docs.github.com/en/github/finding-security-vulnerabilities-and-errors-in-your-code/about-code-scanning)
  - [Sample Code](https://github.com/ninadingole/github-codescan)
  - [Github CodeQL Additional Queries](https://github.com/github/codeql/)
  - [CodeQL for GoLang](https://github.com/github/codeql-go)
  - [https://github.blog/2020-09-30-code-scanning-is-now-available/](https://github.blog/2020-09-30-code-scanning-is-now-available/)
  
  _Updated on 22/05/2021 : Add comparison of code scanning vs sonarqube_
