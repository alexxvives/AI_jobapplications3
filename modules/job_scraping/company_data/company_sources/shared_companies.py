#!/usr/bin/env python3
"""
Shared company list for all platform scrapers
Extracted from mass_lever_1000_scraper.py to be used across all ATS platforms
"""

def get_shared_companies():
    """
    Build a comprehensive list of 1000+ companies for all platform scrapers
    Returns list of company identifiers that can be used across platforms
    """
    
    # Known working companies from testing
    known_working = [
        "nielsen", "pointclickcare", "octopus", "binance", "paytm", "spotify", "plaid"
    ]
    
    # Fortune 500 companies (URL-friendly versions)
    fortune_500 = [
        "walmart", "amazon", "apple", "cvs", "unitedhealthgroup", "exxonmobil", "berkshirehathaway",
        "alphabet", "mckesson", "amerisourcebergen", "costco", "citygroupinc", "microsoft", "dell",
        "cardinalhealth", "chevron", "att", "fordmotor", "jpmorgan", "verizon", "generalmotors",
        "walgreens", "fanniemae", "homedepot", "phillips66", "valero", "generaleectric", "target",
        "freddiemac", "kroger", "boeing", "anthem", "centene", "comcast", "ibm", "express",
        "pfizer", "lockheedmartin", "fedex", "humana", "nike", "intel", "ups", "disney", "johnsonjohnson",
        "starbucks", "cocacola", "pepsi", "visa", "mastercard", "netflix", "paypal", "salesforce",
        "adobe", "oracle", "sap", "vmware", "nvidia", "amd", "cisco", "qualcomm", "broadcom",
        "texas-instruments", "micron", "applied-materials", "kla", "lam-research", "cadence",
        "synopsys", "autodesk", "intuit", "servicenow", "workday", "zoom", "slack", "dropbox",
        "box", "atlassian", "zendesk", "hubspot", "salesforce", "tableau", "splunk", "mongodb",
        "elastic", "datadog", "snowflake", "palantir", "unity", "twilio", "square", "stripe",
        "shopify", "etsy", "wayfair", "overstock", "groupon", "tripadvisor", "booking", "expedia",
        "airbnb", "uber", "lyft", "doordash", "grubhub", "postmates", "instacart", "pinterest",
        "snap", "twitter", "linkedin", "reddit", "discord", "spotify", "pandora", "roku",
        "peloton", "gopro", "fitbit", "tesla", "ford", "gm", "toyota", "honda", "nissan"
    ]
    
    # Tech companies and startups
    tech_companies = [
        "github", "gitlab", "bitbucket", "sourcegraph", "figma", "sketch", "invision", "framer",
        "notion", "airtable", "monday", "asana", "trello", "basecamp", "slack", "discord",
        "zoom", "teams", "webex", "gotomeeting", "calendly", "acuity", "doodle", "when2meet",
        "typeform", "jotform", "google", "forms", "surveymonkey", "qualtrics", "hotjar",
        "fullstory", "logrocket", "sentry", "rollbar", "bugsnag", "honeybadger", "airbrake",
        "mixpanel", "amplitude", "segment", "heap", "google-analytics", "adobe-analytics",
        "kissmetrics", "pendo", "fullstory", "hotjar", "crazy-egg", "optimizely", "unbounce",
        "leadpages", "instapage", "clickfunnels", "convertkit", "mailchimp", "constant-contact",
        "sendgrid", "mailgun", "postmark", "sparkpost", "mandrill", "campaign-monitor",
        "activecampaign", "drip", "klaviyo", "omnisend", "sendinblue", "getresponse",
        "aweber", "infusionsoft", "pardot", "marketo", "eloqua", "hubspot", "pipedrive",
        "salesforce", "zoho", "freshsales", "close", "outreach", "salesloft", "apollo",
        "zoominfo", "leadiq", "clearbit", "fullcontact", "pipl", "whitepages", "spokeo"
    ]
    
    # Y Combinator companies (common users of modern ATS)
    yc_companies = [
        "stripe", "airbnb", "dropbox", "reddit", "twitch", "coinbase", "instacart", "doordash",
        "gitlab", "segment", "amplitude", "mixpanel", "heap", "clerk", "vercel", "supabase",
        "planetscale", "railway", "render", "fly", "netlify", "cloudflare", "fastly", "bunny",
        "linear", "height", "plane", "clickup", "notion", "coda", "roam", "obsidian",
        "logseq", "craft", "bear", "ulysses", "typora", "mark-text", "zettlr", "joplin",
        "notable", "vnote", "qownnotes", "turtl", "laverna", "boostnote", "notable",
        "simplenote", "evernote", "onenote", "notion", "obsidian", "roam", "logseq"
    ]
    
    # European companies
    european_companies = [
        "spotify", "klarna", "revolut", "monzo", "starling", "n26", "bunq", "qonto",
        "penta", "solaris", "solarisbank", "mambu", "temenos", "finastra", "murex",
        "calypso", "symphony", "fis", "fiserv", "jack-henry", "ncr", "diebold",
        "wincor", "nixdorf", "ingenico", "verifone", "worldpay", "adyen", "checkout",
        "mollie", "ogone", "buckaroo", "multisafepay", "sisow", "paynl", "pay",
        "ideal", "bancontact", "sofort", "giropay", "eps", "przelewy24", "dotpay"
    ]
    
    # Asian companies  
    asian_companies = [
        "paytm", "razorpay", "cashfree", "instamojo", "payu", "ccavenue", "billdesk",
        "citrus", "mobikwik", "freecharge", "phonepe", "googlepay", "amazonpay", "flipkart",
        "snapdeal", "myntra", "jabong", "nykaa", "zomato", "swiggy", "ola", "uber",
        "grab", "gojek", "tokopedia", "bukalapak", "shopee", "lazada", "sea", "garena",
        "tiktok", "bytedance", "xiaomi", "oppo", "vivo", "oneplus", "realme", "honor",
        "huawei", "samsung", "lg", "sony", "panasonic", "sharp", "toshiba", "fujitsu",
        "nec", "hitachi", "mitsubishi", "canon", "nikon", "olympus", "fujifilm", "ricoh"
    ]
    
    # Additional tech variations and formats
    additional_companies = []
    base_companies = ["facebook", "google", "microsoft", "amazon", "apple", "netflix", "uber", "airbnb"]
    
    for company in base_companies:
        additional_companies.extend([
            company, f"{company}-inc", f"{company}inc", f"{company}-corp", f"{company}corp",
            f"{company}-ltd", f"{company}ltd", f"{company}-llc", f"{company}llc"
        ])
    
    # Combine all lists and remove duplicates
    all_companies = (
        known_working + fortune_500 + tech_companies + yc_companies + 
        european_companies + asian_companies + additional_companies
    )
    
    # Remove duplicates and convert to lowercase
    unique_companies = list(set([company.lower().strip() for company in all_companies if company]))
    
    return unique_companies


def get_company_variations(company_name):
    """
    Generate common variations of a company name for better matching
    """
    variations = [company_name]
    
    # Add common corporate suffixes
    base_name = company_name.replace('-', '').replace('_', '')
    variations.extend([
        f"{base_name}-inc", f"{base_name}inc", f"{base_name}-corp", f"{base_name}corp",
        f"{base_name}-ltd", f"{base_name}ltd", f"{base_name}-llc", f"{base_name}llc",
        f"{base_name}-company", f"{base_name}company"
    ])
    
    # Add hyphenated versions
    variations.extend([
        company_name.replace('_', '-'),
        company_name.replace('-', '_'),
        company_name.replace(' ', '-'),
        company_name.replace(' ', '_')
    ])
    
    return list(set(variations))


if __name__ == "__main__":
    companies = get_shared_companies()
    print(f"Total shared companies: {len(companies)}")
    print(f"First 10: {companies[:10]}")