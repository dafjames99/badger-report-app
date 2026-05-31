<h1 style = "color: red">Deployment roadmap</h1>

## Immediate
- [x] <span style="color:red"> Deploy to Vercel.</span>
    - Secret management?
    - Security issues
    - Branding
- [ ] <span style="color:orange">Implement A CI/CD pipeline, most likely using some curl tests & (somehow) verifying offline-cache-online-submit functionality.</span>
- [x] <span style="color:yellow">Work on reported bug issues</span>
## Eventual
- [ ] Wrap with Capacitor to produce Native android / iOS app.

<h1 style = "color: green">Extensions</h1>

## Alterations
- [x] Centralize control over & experiment with **aesthetic/style** of the app.a
- [x] Changed the "is suitable" toggle feature to be a **non-default** but **required** checkbox (?) input - Thereby avoiding lazy reports.
## New Features
- [ ] Add a report bug feature. 
- [ ] Add some callback functionality within the email reports. For example, 
    - pointing to "report an issue" via the github page
    - extra information on how to *use* the information in reports ("copy & paste GPS coords into W3W")
    - Pointing to the GoogleSheets
- [ ] Instructional copy in the main application
    - *"Submit a new report when you come across a badger"*
    - *"please only badgers"*
    - *"only wales"*
- [ ] **Validate location for wales-only(?)**