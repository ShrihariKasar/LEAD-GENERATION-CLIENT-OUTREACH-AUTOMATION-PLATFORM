# LinkedIn Integration Architecture & Platform Limitations

THREADLINE follows strict compliance guidelines regarding social network integrations.

## 1. Compliance Principle
THREADLINE exclusively utilizes official, approved LinkedIn Developer Platform APIs.

### Strictly Prohibited Practices
- **No Headless Browser Automation**: Puppeteer, Selenium, or Playwright are never used to automate personal LinkedIn sessions.
- **No HTML Scraping**: No automated parsing of public or private LinkedIn profiles.
- **No Captcha Bypassing**: No techniques designed to bypass LinkedIn bot detection.
- **No Stored Passwords**: User LinkedIn passwords or session cookies are never collected or stored.

## 2. Capability Detection & Transparency
Under LinkedIn's Developer Platform policies, direct 1-to-1 messaging via REST API is restricted to approved LinkedIn Enterprise Partner applications (Sales Solutions / Recruiter API partners).

When an application is connected using standard OpenID Connect scopes (`openid`, `profile`, `email`), THREADLINE:
1. Detects available scopes and marks the integration status as `RESTRICTED`.
2. Truthfully informs the user:
   > *"LinkedIn capability restricted for this application: Official direct messaging requires LinkedIn Enterprise Partner API approval."*
3. Enables **Assisted Outreach Workflow**: allows sales representatives to copy grounded personalization copy and log outreach activities manually without faking automated API success.
