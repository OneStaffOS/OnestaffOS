"""
Configuration for Ticket Classifier
Agent IDs and Routing Rules
"""

# Agent IDs mapping
AGENT_IDS = {
    "Agent 1": "692479b918668dee67209282",  # Software Specialist
    "Agent 2": "692a056cfad7d194cd3f0992",  # Hardware Specialist
    "Agent 3": "69438f79c1af7ec03ff7fed0",  # Network Specialist
}

# Agent specializations (primary expertise)
AGENT_SPECIALIZATIONS = {
    "Agent 1": "software",
    "Agent 2": "hardware",
    "Agent 3": "network",
}

# Reverse mapping: Type to primary agent
TYPE_TO_PRIMARY_AGENT = {
    "software": "Agent 1",
    "hardware": "Agent 2",
    "network": "Agent 3",
}

# Load distribution for secondary assignments
# Format: (priority, type) -> agent
LOAD_DISTRIBUTION = {
    # High priority - assigned by major expertise
    ("high", "software"): "Agent 1",
    ("high", "hardware"): "Agent 2",
    ("high", "network"): "Agent 3",
    
    # Medium priority - distributed across agents
    ("medium", "software"): "Agent 1",  # Primary
    ("medium", "hardware"): "Agent 2",  # Primary
    ("medium", "network"): "Agent 3",   # Primary
    
    # Secondary medium assignments (when primary is busy)
    # Agent 1 also handles: Medium Network
    # Agent 2 also handles: Medium Software
    # Agent 3 also handles: Medium Hardware
    
    # Low priority - cross-distributed
    ("low", "software"): "Agent 1",   # Primary
    ("low", "hardware"): "Agent 2",   # Primary  
    ("low", "network"): "Agent 3",    # Primary
    
    # Secondary low assignments (when primary is busy)
    # Agent 1 also handles: Low Hardware
    # Agent 2 also handles: Low Network
    # Agent 3 also handles: Low Software
}

# Secondary assignment rules (when primary agent is at capacity)
SECONDARY_ASSIGNMENTS = {
    # For medium priority tickets
    ("medium", "network"): ["Agent 3", "Agent 1"],   # Agent 1 is secondary for medium network
    ("medium", "software"): ["Agent 1", "Agent 2"],  # Agent 2 is secondary for medium software
    ("medium", "hardware"): ["Agent 2", "Agent 3"],  # Agent 3 is secondary for medium hardware
    
    # For low priority tickets
    ("low", "hardware"): ["Agent 2", "Agent 1"],     # Agent 1 is secondary for low hardware
    ("low", "network"): ["Agent 3", "Agent 2"],      # Agent 2 is secondary for low network
    ("low", "software"): ["Agent 1", "Agent 3"],     # Agent 3 is secondary for low software
}

# Maximum concurrent tickets per agent
MAX_TICKETS_PER_AGENT = 5

# Priority levels (in order of importance)
PRIORITY_LEVELS = ["high", "medium", "low"]

# Ticket types
TICKET_TYPES = ["software", "hardware", "network"]

# Ticket statuses
TICKET_STATUS = {
    "OPEN": "open",
    "PENDING": "pending",
    "CLOSED": "closed",
}

# Feature encoding for neural network
PRIORITY_ENCODING = {
    "low": 0,
    "medium": 1,
    "high": 2,
}

TYPE_ENCODING = {
    "software": 0,
    "hardware": 1,
    "network": 2,
}

AGENT_ENCODING = {
    "Agent 1": 0,
    "Agent 2": 1,
    "Agent 3": 2,
}

# Reverse encodings for decoding predictions
PRIORITY_DECODING = {v: k for k, v in PRIORITY_ENCODING.items()}
TYPE_DECODING = {v: k for k, v in TYPE_ENCODING.items()}
AGENT_DECODING = {v: k for k, v in AGENT_ENCODING.items()}
