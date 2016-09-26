# Mailgun Log

**PROJECT IN PROGRESS**

Maintains a Mailgun log in a simple JSON file. Suitable only for domains with activity suitable for management in a text file.

## Setup

The script requires an environment variable `MAILGUN_PRIVATE_API_KEY` containing
the private key of the Mailgun account with the domains that logs are to be
archived for. This can be defined in ~/.profile.

```
echo 'export MAILGUN_PRIVATE_API_KEY="key-..."'
```

## Schedule

Prefer anacron to cron so that the log will be updated on the defined schedule,
or whenever the daemon is available (if the scheduled time is missed).
