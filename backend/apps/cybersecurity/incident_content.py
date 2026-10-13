"""Incident guidance. Deliberately lists no phone numbers (they change and can be spoofed); it directs people to official channels."""
INCIDENT_GUIDES = [
    {"id": "suspicious-payment", "title": "Suspicious payment notification", "summary": "A payment text arrived, or a customer says they paid, but something feels wrong.", "steps": [
        {"title": "Pause before handing over goods", "detail": "Do not release items or services until you have confirmed the payment yourself."},
        {"title": "Check inside your own account", "detail": "Open the official app or your usual menu and look at your balance and statement. A text or screenshot can be forged."},
        {"title": "Never send money back on request", "detail": "If someone says they paid by mistake, ask them to contact their provider. Genuine reversals go through the provider."},
        {"title": "Keep evidence safely", "detail": "Take screenshots of messages and note numbers and times. Do not include PINs or codes."},
        {"title": "Report through official channels", "detail": "Contact your provider using the number or app from your SIM pack, card or official website."}]},
    {"id": "compromised-account", "title": "Possible account compromise", "summary": "You cannot log in, saw activity you did not do, or shared a password by mistake.", "steps": [
        {"title": "Change the password from a device you trust", "detail": "Start with email, because other accounts can be reset through it."},
        {"title": "Sign out other sessions", "detail": "Most services have a “log out of all devices” option in security settings."},
        {"title": "Turn on two-step verification", "detail": "This makes a stolen password much less useful."},
        {"title": "Check recovery details", "detail": "Make sure the recovery phone number and email are yours and were not changed."},
        {"title": "Warn your customers", "detail": "Tell people if scammers might message them pretending to be you."},
        {"title": "Contact the service's official support", "detail": "Use the help page inside the official app or website."}]},
    {"id": "lost-phone", "title": "Lost or stolen phone", "summary": "Your phone may be in someone else's hands.", "steps": [
        {"title": "Contact your mobile provider", "detail": "Ask to block the SIM and arrange a replacement through their official channel."},
        {"title": "Lock or locate the device", "detail": "Use your phone's find-my-device feature to lock it or erase it remotely."},
        {"title": "Secure your accounts", "detail": "Change passwords for email, social media and any banking or money apps, using another device."},
        {"title": "Tell your bank and mobile-money provider", "detail": "Use their official channels so they can protect your accounts."},
        {"title": "Report the loss if required", "detail": "Your provider may ask for a police report before replacing a SIM."},
        {"title": "Warn your contacts", "detail": "Let customers know not to trust unusual messages from your number until you are back online."}]},
    {"id": "suspicious-link", "title": "Opened a suspicious link", "summary": "You tapped a link or opened a file you now doubt.", "steps": [
        {"title": "Stop and do not type anything", "detail": "Close the page. Do not enter passwords, PINs or codes."},
        {"title": "If you entered details, change them now", "detail": "Change the password from a trusted device and contact the provider through an official channel."},
        {"title": "If an app was installed, remove it", "detail": "Uninstall unknown apps and remove any special permissions they asked for."},
        {"title": "Review recent activity", "detail": "Check your payments, messages and account activity for anything you do not recognise."},
        {"title": "Turn on two-step verification", "detail": "It adds protection even if a password was exposed."}]},
    {"id": "customer-scam", "title": "A customer reports a possible scam", "summary": "Someone says they were tricked, perhaps by a person pretending to be your business.", "steps": [
        {"title": "Stay calm and listen", "detail": "Collect what happened, when, and which numbers or messages were involved. Never ask for PINs or codes."},
        {"title": "Point them to their provider", "detail": "Ask them to contact their mobile-money provider or bank through official channels."},
        {"title": "Check your own accounts", "detail": "Make sure your accounts were not misused. Use the compromise guide if you are unsure."},
        {"title": "Warn your customers", "detail": "Tell them which numbers and links are really yours."},
        {"title": "Protect the customer's privacy", "detail": "Share their details only with the provider or authorities who need them."}]},
]
