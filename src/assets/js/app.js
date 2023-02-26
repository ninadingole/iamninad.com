const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

/**
 *  Theme switcher
 */
const html = $('html');
const themeButton = $('.js-theme-btn');

let themeClass = {
  light: 'ThemeButton--Light',
  dark: 'ThemeButton--Dark',
};

// Add the current theme class to display the correct icon in the UI
themeButton.classList.add(themeClass[html.dataset.theme || 'light']);

/**
 *  Toggle between light/dark classes when the button is clicked and store the value in local 
 *  localStorage which is used to know the selected theme on repeated visits
 */
themeButton.addEventListener('click', event => {
  let currentTheme = html.dataset.theme || 'light';
  let selectedTheme = currentTheme === 'light' ? 'dark' : 'light';
  const consentTheme = currentTheme === 'light' ? '' : 'c_darkmode';
  let textLabel = `Activate ${currentTheme} mode`;

  event.currentTarget.classList.remove(themeClass[currentTheme])
  event.currentTarget.classList.add(themeClass[selectedTheme])

  event.currentTarget.setAttribute('title', textLabel)
  event.currentTarget.setAttribute('aria-label', textLabel)

  if (selectedTheme === 'dark') {
    document.body.classList.add('c_darkmode');
  } else {
    document.body.classList.remove('c_darkmode');
  }

  html.dataset.theme = selectedTheme;
  localStorage.setItem('currentTheme', selectedTheme);
});

window.addEventListener('load', function(){

  // obtain plugin
  var cc = initCookieConsent();

  // run plugin with your configuration
  cc.run({
    gui_options: {
      consent_modal: {
        layout: 'cloud',               // box/cloud/bar
        position: 'bottom center',     // bottom/middle/top + left/right/center
        transition: 'slide',           // zoom/slide
        swap_buttons: false            // enable to invert buttons
      },
      settings_modal: {
        layout: 'box',                 // box/bar
        // position: 'left',           // left/right
        transition: 'slide'            // zoom/slide
      }
    },
    current_lang: 'en',
    autoclear_cookies: true,                   // default: false
    page_scripts: true,                        // default: false

    // mode: 'opt-in'                          // default: 'opt-in'; value: 'opt-in' or 'opt-out'
    // delay: 0,                               // default: 0
    // auto_language: '',                      // default: null; could also be 'browser' or 'document'
    // autorun: true,                          // default: true
    // force_consent: false,                   // default: false
    // hide_from_bots: true,                   // default: true
    // remove_cookie_tables: false             // default: false
    // cookie_name: 'cc_cookie',               // default: 'cc_cookie'
    // cookie_expiration: 182,                 // default: 182 (days)
    // cookie_necessary_only_expiration: 182   // default: disabled
    // cookie_domain: location.hostname,       // default: current domain
    // cookie_path: '/',                       // default: root
    // cookie_same_site: 'Lax',                // default: 'Lax'
    // use_rfc_cookie: false,                  // default: false
    // revision: 0,                            // default: 0

    onFirstAction: function(user_preferences, cookie){
      // callback triggered only once on the first accept/reject action
    },

    onAccept: function (cookie) {
      // callback triggered on the first accept/reject action, and after each page load
    },

    onChange: function (cookie, changed_categories) {
      // callback triggered when user changes preferences after consent has already been given
    },

    languages: {
      'en': {
        consent_modal: {
          title: 'We use cookies!',
          description: 'Hi, this website uses essential cookies to ensure its proper operation and tracking cookies to understand how you interact with it. The latter will be set only after consent. <button type="button" data-cc="c-settings" class="cc-link">Let me choose</button>',
          primary_btn: {
            text: 'Accept all',
            role: 'accept_all'              // 'accept_selected' or 'accept_all'
          },
          secondary_btn: {
            text: 'Reject all',
            role: 'accept_necessary'        // 'settings' or 'accept_necessary'
          }
        },
        settings_modal: {
          title: 'Cookie preferences',
          save_settings_btn: 'Save settings',
          accept_all_btn: 'Accept all',
          reject_all_btn: 'Reject all',
          close_btn_label: 'Close',
          cookie_table_headers: [
            {col1: 'Name'},
            {col2: 'Domain'},
            {col3: 'Expiration'},
            {col4: 'Description'}
          ],
          blocks: [
            {
              title: 'Cookie usage <span role="img" aria-label="loudspeaker" title="loudspeaker">📢</span>',
              description: 'I use cookies to ensure the basic functionalities of the website and to enhance your online experience. You can choose for each category to opt-in/out whenever you want. For more details relative to cookies and other sensitive data, please read the full <a href="#" class="cc-link">privacy policy</a>.'
            }, {
              title: 'Strictly necessary cookies',
              description: 'These cookies are essential for the proper functioning of my website. Without these cookies, the website would not work properly',
              toggle: {
                value: 'necessary',
                enabled: true,
                readonly: true          // cookie categories with readonly=true are all treated as "necessary cookies"
              }
            }, {
              title: 'Performance and Analytics cookies',
              description: 'These cookies allow the website to remember the choices you have made in the past',
              toggle: {
                value: 'analytics',     // your cookie category
                enabled: false,
                readonly: false
              },
              cookie_table: [             // list of all expected cookies
                {
                  col1: '^_hp2',       // match all cookies starting with "_ga"
                  col2: 'heapanalytics.com',
                  col3: '1 years',
                  col4: 'No personal information is tracked, only usage data',
                  is_regex: true
                },
              ]
            }, {
              title: 'Advertisement and Targeting cookies',
              description: 'These cookies collect information about how you use the website, which pages you visited and which links you clicked on. All of the data is anonymized and cannot be used to identify you',
              toggle: {
                value: 'targeting',
                enabled: false,
                readonly: false
              }
            }, {
              title: 'More information',
              description: 'For any queries in relation to our policy on cookies and your choices, please <a class="cc-link" href="#yourcontactpage">contact us</a>.',
            }
          ]
        }
      }
    }
  });
});

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

// Revoke consent by default
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'analytics_storage': 'denied'
});

