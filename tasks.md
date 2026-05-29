# Google Drive - Service account can't upload images
The service account has a 0-byte storage quota limit. To fix this, alter the Google Drive integration module so that immediately following a successful file creation call, it executes a permissions.create call with transferOwnership=true to pass full object ownership directly over to my personal email address.

