---
title: Burp Suite For Web App Testing Go Lang
excerpt: 'Configure burp suite as a proxy for golang application'
date: 2019-12-31
draft: false
postImage: https://source.unsplash.com/cvBBO4PzWPg/920x460
postImageCredits: Markus Spiske | https://unsplash.com/@markusspiske
postImageSource: Unsplash | https://unsplash.com
tags:
  - testing
  - testing strategy
  - golang
---

Have you ever come across a scenario where you want your code to call a dependent service however need to change the response so that you can test how different your code will behave to different data?

Recently, I came across the same situation where I was looking for a way to change the response of the service that I was consuming and instead of mocking the entire service using a tool like Postman or wire mock, I wanted to hit the actual service and then change a few fields to see if my error handling works as per the expectations.

Normally, we do write an integration test where we mock the service response using wiremock and then write the test for such edge cases. However, sometimes when we do manual testing and we want a way to mock the service response we need some mechanism to intercept the service response and modify the response. This is where Burp suites will help, Burp suites acts like a proxy that will call the actual service on behalf of you and then provides you with tools that can help to easily modify the response and send it back to your application.

For this post, I will be consuming `themoviesdb.org` API's to see details of "Fight Club" movie, and then I will write an application in golang which will connect to Burp Suite, there we modify the response using Burpsuite UI and print the modified response in the console which is received by our application.

```go
package main
import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
)

func main() {

	proxyURL, e := url.Parse(os.Getenv("PROXY"))
	if e != nil {
		panic(e)
	}

	client := &amp;http.Client{
		//Timeout: 20 * time.Second,
		Transport: &amp;http.Transport{
			Proxy: http.ProxyURL(proxyURL),
			TLSClientConfig: &amp;tls.Config{InsecureSkipVerify:true},
		},
	}

	get, err := client.Get(fmt.Sprintf("https://api.themoviedb.org/3/movie/550?api_key=%s", os.Getenv("KEY")))
	if err != nil {
		panic(err)
	}

	var data map[string]interface{}
	err = json.NewDecoder(get.Body).Decode(&amp;data)
	if err != nil {
		panic(err)
	}

	fmt.Printf("Response: %+v",data)
}
```

As you can see in the above code, we create an HTTP client with custom Transport set to proxy URL which is configured in the environment setting of the application, for burp suite the URL is `http://localhost:8080`. The TLSClient config is configured to skip ssl certificate verification using `InsecureSkipVerify:true`. Then we do a normal `GET` request to the api which will get the details of the movie id `550`.

Let's now start the burp suite and configure the intercept rule to only run when the domain matches `themoviedb.org`:

![Add themoviedb domain to intercept criteria](/images/burp-suite-for-web-app-testing-go-lang/Screenshot-2019-12-30-at-2.36.21-PM.png 'Add themoviedb domain to intercept criteria')

Then start the interceptor:

![Enable Intercept](/images/burp-suite-for-web-app-testing-go-lang/Screenshot-2019-12-30-at-2.36.34-PM.png 'Enable Intercept')

Now, run the go application and you will see that the request is captured by the burp suite as follows:

![When the request is captured](/images/burp-suite-for-web-app-testing-go-lang/Screenshot-2019-12-30-at-2.36.43-PM-1.png 'When the request is captured')

After you see the above screen click on the `Action` button and click `Do intercept` with `Response to this request`:

![Select intercept response](/images/burp-suite-for-web-app-testing-go-lang/Screenshot-2019-12-30-at-2.37.00-PM-1.png 'Select intercept response')

After clicking the `Forward` button, burp suite will call the actual service and will open the editor where you can edit the response, this movie is "Flight Club" movie and I have changed the movie name to `Fight Pub` and rating from 8.4 to 9.4. Then click the forward button again to forward the response to the golang app.

![](/images/burp-suite-for-web-app-testing-go-lang/Screenshot-2019-12-30-at-2.37.43-PM-1-.jpg)

Once the application receives this response we just print it to the console and you could see that the name of the movie is now `Fight Pub` and the rating is `9.4` which is what we modified in the response.

```log
Response: map[adult:false
backdrop_path:/mMZRKb3NVo5ZeSPEIaNW9buLWQ0.jpg belongs_to_collection:&lt;nil&gt;
budget:6.3e+07
genres:[map[id:18 name:Drama]]
homepage:http://www.foxmovies.com/movies/fight-club id:550 imdb_id:tt0137523
original_language:en
original_title:Fight Pub
overview:A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy. Their concept catches on, with underground "fight clubs" forming in every town, until an eccentric gets in the way and ignites an out-of-control spiral toward oblivion.
popularity:58.844
poster_path:/adw6Lq9FiC9zjYEpOqfq03ituwp.jpg
production_companies:[map[id:508 logo_path:/7PzJdsLGlR7oW4J0J5Xcd0pHGRg.png name:Regency Enterprises origin_country:US] map[id:711 logo_path:/tEiIH5QesdheJmDAqQwvtN60727.png name:Fox 2000 Pictures origin_country:US] map[id:20555 logo_path:/hD8yEGUBlHOcfHYbujp71vD8gZp.png name:Taurus Film origin_country:DE] map[id:54051 logo_path:&lt;nil&gt; name:Atman Entertainment origin_country:] map[id:54052 logo_path:&lt;nil&gt; name:Knickerbocker Films origin_country:US] map[id:25 logo_path:/qZCc1lty5FzX30aOCVRBLzaVmcp.png name:20th Century Fox origin_country:US] map[id:4700 logo_path:/A32wmjrs9Psf4zw0uaixF0GXfxq.png name:The Linson Company origin_country:]]
production_countries:[map[iso_3166_1:DE name:Germany] map[iso_3166_1:US name:United States of America]]
release_date:1999-10-15
revenue:1.00853753e+08
runtime:139
spoken_languages:[map[iso_639_1:en name:English]]
status:Released
tagline:Mischief. Mayhem. Soap.
title:Fight Pub
video:false
vote_average:9.4
vote_count:17753]
```

So, thats how you can connect your application to the burp suite and can intercept the response of the services to manually test the application for different cases.

I hope this post helps you to understand how to configure an HTTP client in your code to connect to Burp suite, I have used golang for this post because I am currently working on it. However, if you are working on any other programming language the HTTP Api's will have some way to configure the proxy as like I have done in my golang code.

Happy Coding!
