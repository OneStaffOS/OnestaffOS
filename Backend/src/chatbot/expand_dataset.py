"""
Dataset Expansion Script for IT Help Desk Chatbot

This script automatically expands training patterns using:
1. Synonym replacement
2. Common phrase prefixes/suffixes
3. Question variations
4. Typo simulation
5. Word order variations
"""

import json
import random
import re
from typing import List, Dict, Set
from pathlib import Path

# IT Domain Synonyms
SYNONYMS = {
    # Actions
    "reset": ["change", "update", "modify", "set new"],
    "fix": ["repair", "resolve", "solve", "troubleshoot", "debug"],
    "install": ["setup", "set up", "download", "add", "get"],
    "connect": ["link", "join", "access", "get on", "hook up"],
    "working": ["functioning", "running", "operating", "active"],
    "not working": ["broken", "down", "failing", "malfunctioning", "dead", "not functioning", "stopped working"],
    "help": ["assist", "support", "aid"],
    "check": ["verify", "look at", "review", "see"],
    "slow": ["sluggish", "laggy", "taking forever", "freezing", "hanging"],
    
    # Objects
    "password": ["pass", "pwd", "credentials", "login info"],
    "computer": ["PC", "machine", "workstation", "device", "system"],
    "laptop": ["notebook", "portable", "MacBook", "ThinkPad"],
    "email": ["mail", "outlook", "inbox", "messages"],
    "internet": ["web", "network", "connection", "online"],
    "wifi": ["wireless", "wi-fi", "WLAN"],
    "printer": ["print device", "printing machine"],
    "monitor": ["screen", "display", "external display"],
    "keyboard": ["keys", "typing device"],
    "mouse": ["cursor", "pointer", "trackpad"],
    "software": ["program", "application", "app", "tool"],
    "account": ["profile", "user account", "login"],
    "ticket": ["request", "issue", "case", "incident"],
    
    # States
    "issue": ["problem", "trouble", "error", "bug", "glitch"],
    "error": ["issue", "problem", "fault", "failure"],
}

# Common question prefixes
QUESTION_PREFIXES = [
    "how do I",
    "how can I",
    "how to",
    "I need to",
    "I want to",
    "can you help me",
    "please help me",
    "I'm trying to",
    "what's the way to",
    "can I",
    "is it possible to",
    "I'd like to",
    "need help with",
    "help me",
    "show me how to",
    "tell me how to",
    "what should I do to",
    "I need help",
    "having trouble",
    "struggling to",
]

# Common issue prefixes
ISSUE_PREFIXES = [
    "my",
    "the",
    "our",
    "this",
    "I have a",
    "there's a",
    "experiencing",
    "getting",
    "having",
    "facing",
    "dealing with",
]

# Common suffixes
SUFFIXES = [
    "",
    "please",
    "help",
    "please help",
    "urgent",
    "asap",
    "thanks",
    "can you help",
    "need help",
    "it's urgent",
    "quickly please",
]

# Typo patterns (character swaps, missing chars, double chars)
def generate_typos(word: str) -> List[str]:
    """Generate common typos for a word"""
    typos = []
    if len(word) < 4:
        return typos
    
    # Character swap
    for i in range(len(word) - 1):
        typo = word[:i] + word[i+1] + word[i] + word[i+2:]
        typos.append(typo)
    
    # Missing character
    for i in range(1, len(word) - 1):
        typo = word[:i] + word[i+1:]
        typos.append(typo)
    
    # Double character
    for i in range(1, len(word)):
        typo = word[:i] + word[i-1] + word[i:]
        typos.append(typo)
    
    return typos[:3]  # Limit typos


def expand_with_synonyms(pattern: str) -> List[str]:
    """Expand pattern by replacing words with synonyms"""
    expanded = [pattern]
    words = pattern.lower().split()
    
    for i, word in enumerate(words):
        # Check for multi-word synonyms first
        for phrase, replacements in SYNONYMS.items():
            if phrase in pattern.lower():
                for replacement in replacements:
                    new_pattern = pattern.lower().replace(phrase, replacement)
                    if new_pattern != pattern.lower():
                        expanded.append(new_pattern)
        
        # Single word synonyms
        if word in SYNONYMS:
            for synonym in SYNONYMS[word]:
                new_words = words.copy()
                new_words[i] = synonym
                expanded.append(" ".join(new_words))
    
    return list(set(expanded))


def add_prefixes(pattern: str, intent_type: str) -> List[str]:
    """Add common prefixes to patterns"""
    expanded = [pattern]
    pattern_lower = pattern.lower().strip()
    
    # Skip if already has a prefix
    skip_words = ["how", "what", "when", "where", "why", "can", "could", "would", "I", "my", "the", "please", "help"]
    if any(pattern_lower.startswith(word) for word in skip_words):
        # Just add a few variations
        if not pattern_lower.startswith("please"):
            expanded.append(f"please {pattern_lower}")
        return expanded
    
    # Select appropriate prefixes based on intent type
    if intent_type in ["greeting", "goodbye", "thanks", "frustrated"]:
        return expanded  # Don't add prefixes to conversational intents
    
    prefixes = random.sample(QUESTION_PREFIXES, min(5, len(QUESTION_PREFIXES)))
    for prefix in prefixes:
        expanded.append(f"{prefix} {pattern_lower}")
    
    return expanded


def add_suffixes(pattern: str) -> List[str]:
    """Add common suffixes to patterns"""
    expanded = [pattern]
    pattern_lower = pattern.lower().strip()
    
    # Don't add suffixes to already long patterns
    if len(pattern_lower.split()) > 6:
        return expanded
    
    suffixes = random.sample([s for s in SUFFIXES if s], min(3, len(SUFFIXES) - 1))
    for suffix in suffixes:
        if suffix and suffix not in pattern_lower:
            expanded.append(f"{pattern_lower} {suffix}")
    
    return expanded


def generate_variations(pattern: str, intent_type: str) -> List[str]:
    """Generate all variations of a pattern"""
    variations = set()
    variations.add(pattern.lower())
    
    # 1. Synonym expansion
    synonym_expanded = expand_with_synonyms(pattern)
    for exp in synonym_expanded:
        variations.add(exp.lower())
    
    # 2. Add prefixes (for non-conversational intents)
    for var in list(variations)[:5]:
        prefixed = add_prefixes(var, intent_type)
        for p in prefixed:
            variations.add(p.lower())
    
    # 3. Add suffixes
    for var in list(variations)[:10]:
        suffixed = add_suffixes(var)
        for s in suffixed:
            variations.add(s.lower())
    
    # 4. Generate some typos (sparingly)
    base_patterns = list(variations)[:3]
    for bp in base_patterns:
        words = bp.split()
        if len(words) >= 2:
            # Add typo to one random word
            idx = random.randint(0, len(words) - 1)
            if len(words[idx]) >= 4:
                typos = generate_typos(words[idx])
                if typos:
                    new_words = words.copy()
                    new_words[idx] = typos[0]
                    variations.add(" ".join(new_words))
    
    return list(variations)


# Additional patterns for specific intents
INTENT_TEMPLATES = {
    "password_reset": [
        "forgot my password",
        "can't remember my password",
        "password expired",
        "need to change password",
        "reset password",
        "my password doesn't work",
        "password not accepted",
        "wrong password error",
        "locked out password",
        "change my login password",
        "new password needed",
        "password reset link",
        "forgot login credentials",
        "can't login forgot password",
        "password won't work",
        "my password isn't working",
        "need a new password",
        "how do I change my password",
        "password change request",
        "update my password",
        "forgot my pass",
        "lost my password",
        "don't remember password",
        "expired password",
        "password has expired",
    ],
    "login_issues": [
        "can't log in",
        "login not working",
        "unable to sign in",
        "login failed",
        "can't access my account",
        "authentication error",
        "login keeps failing",
        "won't let me log in",
        "sign in error",
        "login page not working",
        "can't get into my account",
        "access denied",
        "invalid credentials",
        "username not working",
        "account access problem",
        "can't authenticate",
        "login screen stuck",
        "session expired login",
        "my login doesn't work",
        "logging in problem",
        "sign in not working",
        "can't sign into account",
        "login error message",
        "trouble logging in",
        "login issue",
    ],
    "vpn_connection": [
        "VPN not working",
        "can't connect to VPN",
        "VPN won't connect",
        "VPN keeps disconnecting",
        "VPN connection failed",
        "remote access not working",
        "VPN timeout",
        "VPN error",
        "setup VPN",
        "configure VPN",
        "VPN authentication failed",
        "can't access work remotely",
        "VPN keeps dropping",
        "VPN issues at home",
        "work VPN problem",
        "corporate VPN not connecting",
        "VPN client error",
        "GlobalProtect not working",
        "Cisco VPN problem",
        "connect to office VPN",
        "VPN connection issues",
        "my VPN won't work",
        "having VPN problems",
        "trouble with VPN",
        "VPN doesn't connect",
    ],
    "wifi_issues": [
        "wifi not working",
        "can't connect to wifi",
        "wifi keeps disconnecting",
        "no wifi signal",
        "wifi slow",
        "wireless not connecting",
        "wifi password",
        "connect to office wifi",
        "wifi drops constantly",
        "weak wifi signal",
        "wifi network not showing",
        "can't find wifi network",
        "wifi authentication failed",
        "wireless internet down",
        "wifi connection lost",
        "my wifi isn't working",
        "trouble connecting to wifi",
        "wifi keeps dropping",
        "no wireless connection",
        "wifi signal weak",
        "office wifi not working",
        "wifi problems",
        "wireless issues",
        "can't get on wifi",
        "wifi won't connect",
    ],
    "network_connectivity": [
        "internet not working",
        "no internet connection",
        "can't access websites",
        "network down",
        "internet slow",
        "pages won't load",
        "connection issues",
        "no network",
        "website not loading",
        "DNS error",
        "network error",
        "can't reach server",
        "connectivity problems",
        "internet keeps dropping",
        "no internet access",
        "web pages not loading",
        "network connection lost",
        "internet disconnected",
        "slow network",
        "can't browse internet",
        "internet issues",
        "network problems",
        "connection timeout",
        "can't get online",
        "internet connection problem",
    ],
    "email_issues": [
        "email not working",
        "can't send email",
        "not receiving emails",
        "Outlook problems",
        "email stuck in outbox",
        "mailbox full",
        "email sync issues",
        "can't open email",
        "Outlook crashing",
        "email not syncing",
        "email error",
        "can't access email",
        "outlook not responding",
        "email loading slow",
        "missing emails",
        "email won't send",
        "Outlook freezing",
        "email attachment problem",
        "can't download attachment",
        "out of office not working",
        "email signature issue",
        "shared mailbox problem",
        "calendar not syncing",
        "email configuration",
        "setup outlook",
    ],
    "printer_issues": [
        "printer not working",
        "can't print",
        "printer offline",
        "printer jam",
        "print job stuck",
        "add printer",
        "install printer",
        "printer not found",
        "documents not printing",
        "printer error",
        "connect to printer",
        "network printer issue",
        "printer showing offline",
        "print queue stuck",
        "wireless printer not working",
        "printer driver problem",
        "setup printer",
        "find network printer",
        "printer won't print",
        "printing problems",
        "my printer isn't working",
        "trouble printing",
        "can't see printer",
        "printer not responding",
        "print spooler error",
    ],
    "laptop_issues": [
        "laptop not turning on",
        "laptop won't start",
        "laptop battery dead",
        "laptop overheating",
        "laptop running slow",
        "laptop screen black",
        "laptop won't charge",
        "laptop fan loud",
        "laptop frozen",
        "laptop keyboard broken",
        "laptop touchpad not working",
        "need new laptop",
        "laptop replacement",
        "laptop crashed",
        "laptop keeps restarting",
        "laptop blue screen",
        "laptop battery not charging",
        "laptop making noise",
        "laptop shutting down randomly",
        "laptop display issues",
        "my laptop won't turn on",
        "laptop problems",
        "laptop issue",
        "trouble with laptop",
        "laptop not working properly",
    ],
    "keyboard_mouse": [
        "keyboard not working",
        "mouse not working",
        "keys not responding",
        "mouse cursor frozen",
        "wireless keyboard issues",
        "bluetooth mouse problem",
        "keyboard lag",
        "mouse lag",
        "double clicking issue",
        "scroll not working",
        "trackpad not working",
        "keyboard replacement",
        "mouse not moving",
        "keys stuck",
        "mouse clicks not registering",
        "keyboard typing wrong characters",
        "wireless mouse not connecting",
        "keyboard disconnecting",
        "mouse cursor jumping",
        "need new keyboard",
        "need new mouse",
        "keyboard broken",
        "mouse broken",
        "keyboard issues",
        "mouse problems",
    ],
    "monitor_display": [
        "monitor not working",
        "no display",
        "screen black",
        "second monitor not detected",
        "external monitor issue",
        "display flickering",
        "screen blurry",
        "resolution problem",
        "HDMI not working",
        "dual monitor setup",
        "monitor no signal",
        "display not detected",
        "screen too small",
        "extend display",
        "duplicate display",
        "monitor going black",
        "display settings",
        "screen resolution issue",
        "connect external monitor",
        "docking station display",
        "monitor blank",
        "display issues",
        "screen problems",
        "monitor won't turn on",
        "external display not working",
    ],
    "software_installation": [
        "install software",
        "need software",
        "can't install program",
        "software request",
        "download application",
        "install application",
        "need program installed",
        "software access",
        "request new software",
        "install tool",
        "application installation",
        "get software",
        "need to install",
        "software license",
        "approved software list",
        "company software",
        "install permission",
        "software center",
        "add new program",
        "install app",
        "need application",
        "software setup",
        "install new software",
        "program installation",
        "download software",
    ],
    "mfa_setup": [
        "setup two factor",
        "enable 2FA",
        "MFA not working",
        "authenticator app",
        "security code",
        "verification code",
        "setup MFA",
        "two step verification",
        "Google authenticator",
        "Microsoft authenticator",
        "backup codes",
        "recovery codes",
        "2FA setup",
        "configure MFA",
        "authentication app setup",
        "MFA code not working",
        "can't get verification code",
        "authenticator not working",
        "setup authentication",
        "two factor authentication",
        "enable two factor",
        "MFA configuration",
        "set up 2FA",
        "need backup codes",
        "MFA help",
    ],
    "hr_leave_request": [
        "request time off",
        "apply for leave",
        "vacation request",
        "sick leave",
        "PTO request",
        "annual leave",
        "leave balance",
        "check my leave",
        "how many days off",
        "book time off",
        "submit leave request",
        "holiday request",
        "take day off",
        "request vacation",
        "leave application",
        "time off request",
        "check leave balance",
        "remaining leave days",
        "cancel leave",
        "modify leave request",
        "emergency leave",
        "personal day",
        "request PTO",
        "days off remaining",
        "vacation days left",
    ],
    "hr_payroll": [
        "payslip",
        "salary information",
        "pay stub",
        "when do I get paid",
        "pay date",
        "payroll issue",
        "missing pay",
        "incorrect salary",
        "view payslip",
        "download pay stub",
        "tax information",
        "W2 form",
        "pay schedule",
        "direct deposit",
        "change bank details",
        "bonus payment",
        "overtime pay",
        "salary breakdown",
        "paycheck problem",
        "where is my pay",
        "pay not received",
        "salary not correct",
        "payroll question",
        "payment issue",
        "check my salary",
    ],
    "security_phishing": [
        "suspicious email",
        "phishing email",
        "spam email",
        "scam email",
        "report phishing",
        "clicked bad link",
        "malicious email",
        "fake email",
        "weird email",
        "email asking for password",
        "suspicious link",
        "is this email real",
        "got strange email",
        "email looks suspicious",
        "possible phishing",
        "received scam",
        "report spam",
        "clicked suspicious link",
        "opened bad email",
        "email fraud",
        "CEO fraud email",
        "fake invoice email",
        "phishing attempt",
        "suspicious attachment",
        "unknown sender email",
    ],
    "security_virus": [
        "virus detected",
        "malware warning",
        "computer infected",
        "ransomware",
        "antivirus alert",
        "computer hacked",
        "security breach",
        "suspicious activity",
        "pop ups appearing",
        "computer acting weird",
        "virus on computer",
        "malware on PC",
        "got virus",
        "infected with malware",
        "security alert",
        "computer compromised",
        "possible virus",
        "trojan detected",
        "spyware warning",
        "adware popup",
        "remove virus",
        "virus scan",
        "security threat",
        "malicious software",
        "computer has virus",
    ],
    "ticket_status": [
        "check ticket status",
        "my ticket update",
        "ticket progress",
        "when will issue be fixed",
        "any update on my ticket",
        "track my request",
        "ticket number",
        "escalate ticket",
        "urgent ticket",
        "how long will it take",
        "ticket SLA",
        "response time",
        "when will someone help",
        "status of my request",
        "check my ticket",
        "ticket update please",
        "waiting for response",
        "no response on ticket",
        "ticket taking too long",
        "expedite my ticket",
        "priority ticket",
        "follow up on ticket",
        "my request status",
        "issue still not resolved",
        "ticket still open",
    ],
    "greeting": [
        "hi", "hello", "hey", "good morning", "good afternoon",
        "good evening", "hi there", "hello there", "hey there",
        "what's up", "howdy", "greetings", "yo", "hiya", "sup",
        "heya", "good day", "morning", "afternoon", "evening",
        "hi bot", "hello bot", "hey bot", "hi assistant", 
        "hello assistant", "anyone there", "is anyone there",
        "hi help desk", "hello IT", "hey support",
    ],
    "goodbye": [
        "bye", "goodbye", "see you", "see ya", "later", "take care",
        "talk to you later", "have a good day", "thanks bye",
        "that's all", "I'm done", "nothing else", "exit", "quit",
        "close", "end chat", "bye bye", "cya", "ttyl", "peace",
        "I'm good now", "all done", "that's it", "no more questions",
        "done for now", "gotta go", "leaving now", "signing off",
        "thanks goodbye", "thank you bye",
    ],
    "thanks": [
        "thanks", "thank you", "thanks a lot", "thank you so much",
        "appreciate it", "thanks for your help", "that was helpful",
        "great thanks", "perfect thanks", "awesome thank you", "thx",
        "ty", "much appreciated", "cheers", "thanks mate", "thank u",
        "tysm", "thanks so much", "really appreciate it", "helpful",
        "that helped", "problem solved thanks", "worked thank you",
        "thanks a bunch", "many thanks", "thanks for the help",
    ],
    "frustrated": [
        "this is frustrating", "nothing works", "so annoying",
        "I've tried everything", "still not working", "this is useless",
        "waste of time", "can't believe this", "ridiculous", "terrible",
        "worst experience", "hate this", "ugh", "come on", "seriously",
        "this is ridiculous", "so frustrated", "very annoying",
        "getting nowhere", "not helpful", "keeps failing",
        "why isn't this working", "tried everything", "fed up",
        "this sucks", "terrible service", "unacceptable",
    ],
    "system_slow": [
        "computer slow",
        "PC running slow",
        "system laggy",
        "everything is slow",
        "applications slow",
        "slow performance",
        "computer freezing",
        "system hanging",
        "computer takes forever",
        "slow to respond",
        "programs loading slow",
        "system sluggish",
        "computer lagging",
        "PC freezing",
        "slow boot up",
        "startup slow",
        "computer not responding",
        "system unresponsive",
        "very slow computer",
        "PC performance issues",
        "my computer is slow",
        "why is my PC slow",
        "computer too slow",
        "speed up computer",
        "fix slow computer",
    ],
    "office_365": [
        "Office not working",
        "Microsoft 365 issue",
        "Word crashing",
        "Excel problem",
        "PowerPoint error",
        "Teams not working",
        "Office activation",
        "Office license",
        "reinstall Office",
        "Office slow",
        "OneDrive sync",
        "Office update",
        "Word not opening",
        "Excel freezing",
        "Teams crashing",
        "Office 365 login",
        "can't open Word",
        "can't open Excel",
        "Office repair",
        "Microsoft Office issue",
        "Office apps not working",
        "365 subscription",
        "Office error message",
        "Microsoft Teams problem",
        "SharePoint issue",
    ],
    "default_fallback": [
        "I don't know",
        "not sure",
        "confused",
        "what can you do",
        "help me",
        "I need help",
        "can you help",
        "what do you do",
        "how does this work",
        "I have a question",
        "other issue",
        "different problem",
        "something else",
        "none of the above",
        "other",
        "misc",
        "general question",
        "random question",
        "not listed",
        "my issue is different",
    ],
}


def expand_dataset(input_file: str, output_file: str, target_per_intent: int = 100):
    """Expand the dataset to have more patterns per intent"""
    
    # Load original data
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    print(f"Loaded {len(data['intents'])} intents from {input_file}")
    
    total_original = 0
    total_expanded = 0
    
    for intent in data['intents']:
        tag = intent['tag']
        original_patterns = intent.get('patterns', [])
        total_original += len(original_patterns)
        
        # Start with original patterns
        all_patterns = set(p.lower() for p in original_patterns)
        
        # Add template patterns if available
        if tag in INTENT_TEMPLATES:
            for template in INTENT_TEMPLATES[tag]:
                all_patterns.add(template.lower())
        
        # Expand each pattern
        expanded_patterns = set()
        for pattern in list(all_patterns):
            variations = generate_variations(pattern, tag)
            for var in variations:
                expanded_patterns.add(var)
        
        # Combine and deduplicate
        all_patterns = all_patterns.union(expanded_patterns)
        
        # Limit to target (but keep at least original patterns)
        pattern_list = list(all_patterns)
        if len(pattern_list) > target_per_intent:
            # Keep all originals plus random selection of expanded
            originals = set(p.lower() for p in original_patterns)
            expanded_only = [p for p in pattern_list if p not in originals]
            random.shuffle(expanded_only)
            
            remaining_slots = target_per_intent - len(originals)
            pattern_list = list(originals) + expanded_only[:remaining_slots]
        
        # Update intent patterns
        intent['patterns'] = pattern_list
        total_expanded += len(pattern_list)
        
        print(f"  {tag}: {len(original_patterns)} → {len(pattern_list)} patterns")
    
    # Update metadata
    data['metadata']['totalPatterns'] = total_expanded
    data['metadata']['expandedAt'] = "2026-01-04"
    data['metadata']['expansionMethod'] = "synonym_replacement_and_templates"
    
    # Save expanded data
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\n✅ Expansion complete!")
    print(f"   Original patterns: {total_original}")
    print(f"   Expanded patterns: {total_expanded}")
    print(f"   Expansion ratio: {total_expanded/total_original:.1f}x")
    print(f"   Saved to: {output_file}")
    
    return data


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Expand IT Help Desk training dataset')
    parser.add_argument('--input', '-i', default='knowledge-data-backup.json',
                        help='Input JSON file')
    parser.add_argument('--output', '-o', default='knowledge-data.json',
                        help='Output JSON file')
    parser.add_argument('--target', '-t', type=int, default=100,
                        help='Target patterns per intent')
    
    args = parser.parse_args()
    
    # Check if input exists
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"❌ Input file not found: {args.input}")
        return
    
    print("=" * 60)
    print("IT Help Desk Dataset Expansion Tool")
    print("=" * 60)
    
    expand_dataset(args.input, args.output, args.target)
    
    print("\n" + "=" * 60)
    print("Next steps:")
    print("  1. python preprocess.py  # Reprocess expanded data")
    print("  2. python train.py       # Retrain model")
    print("  3. python evaluate.py    # Evaluate accuracy")
    print("=" * 60)


if __name__ == '__main__':
    main()
