"""
NEM market constants, DUID registry, and NEMWeb URL configuration.
All price caps sourced from AEMO NER and annual CPI indexation notices.
"""

# NEM price limits (2024-25 financial year)
MARKET_PRICE_CAP = 17_500       # $/MWh — indexed annually July 1
MARKET_FLOOR_PRICE = -1_000     # $/MWh
CUMULATIVE_PRICE_THRESHOLD = 1_466_300  # $ — 7-day rolling sum trigger
ADMINISTERED_PRICE_CAP = 300    # $/MWh — average cap during APC interval
DISPATCH_INTERVAL_MINUTES = 5
SETTLEMENT_INTERVAL_MINUTES = 30
BID_BANDS = 10

# NEMWeb base URLs
NEMWEB_CURRENT = "https://nemweb.com.au/Reports/Current"
NEMWEB_ARCHIVE = "https://nemweb.com.au/Reports/Archive"

# Report directories
REPORTS = {
    "PUBLIC_PRICES":    "Public_Prices",
    "BIDMOVE_COMPLETE": "Bidmove_Complete",
    "NEXT_DAY_DISPATCH":"Next_Day_Dispatch",
    "DAILY_REPORTS":    "Daily_Reports",
    "DISPATCH_SCADA":   "Dispatch_SCADA",
    "P5MIN":            "P5_Reports",
    "MTPASA_DUID":      "MTPASA_DUIDAvailability",
    "STPASA":           "STPASA_Summary",
    "HIST_DEMAND":      "HistDemand",
    "MLF":              "Marginal_Loss_Factors",
    "PREDISPATCH_SENS": "Predispatch_Sensitivities",
}

# Target regions
TARGET_REGIONS = ["NSW1", "VIC1"]

# Large generator DUID registry — NSW and VIC focus
# DUIDs verified against AEMO NEM Registration and Exemption List
GENERATORS = {
    # ── NSW ──────────────────────────────────────────────────────────────────
    "Bayswater": {
        "participant": "AGL Energy",
        "region": "NSW1",
        "fuel": "Coal",
        "technology": "Steam",
        "registered_capacity_mw": 2640,
        "duids": ["BAYSW1", "BAYSW2", "BAYSW3", "BAYSW4"],
        "unit_capacity_mw": {"BAYSW1": 660, "BAYSW2": 660, "BAYSW3": 660, "BAYSW4": 660},
    },
    "Eraring": {
        "participant": "Origin Energy",
        "region": "NSW1",
        "fuel": "Coal",
        "technology": "Steam",
        "registered_capacity_mw": 2880,
        "duids": ["ERARING1", "ERARING2", "ERARING3", "ERARING4"],
        "unit_capacity_mw": {"ERARING1": 720, "ERARING2": 720, "ERARING3": 720, "ERARING4": 720},
    },
    "Mt Piper": {
        "participant": "EnergyAustralia",
        "region": "NSW1",
        "fuel": "Coal",
        "technology": "Steam",
        "registered_capacity_mw": 1400,
        "duids": ["MTPIPER1", "MTPIPER2"],
        "unit_capacity_mw": {"MTPIPER1": 700, "MTPIPER2": 700},
    },
    "Colongra": {
        "participant": "Snowy Hydro",
        "region": "NSW1",
        "fuel": "Gas",
        "technology": "OCGT",
        "registered_capacity_mw": 667,
        "duids": ["COLNG1", "COLNG2", "COLNG3", "COLNG4"],
        "unit_capacity_mw": {"COLNG1": 167, "COLNG2": 167, "COLNG3": 167, "COLNG4": 166},
    },
    "Tallawarra": {
        "participant": "EnergyAustralia",
        "region": "NSW1",
        "fuel": "Gas",
        "technology": "CCGT",
        "registered_capacity_mw": 435,
        "duids": ["TALLAWARRA1", "TALLAWARRA2"],
        "unit_capacity_mw": {"TALLAWARRA1": 420, "TALLAWARRA2": 15},
    },
    "Uranquinty": {
        "participant": "Origin Energy",
        "region": "NSW1",
        "fuel": "Gas",
        "technology": "OCGT",
        "registered_capacity_mw": 664,
        "duids": ["URANQ1", "URANQ2", "URANQ3", "URANQ4"],
        "unit_capacity_mw": {"URANQ1": 166, "URANQ2": 166, "URANQ3": 166, "URANQ4": 166},
    },
    "Snowy (NSW)": {
        "participant": "Snowy Hydro",
        "region": "NSW1",
        "fuel": "Hydro",
        "technology": "Hydro",
        "registered_capacity_mw": 2082,
        "duids": ["MURRAY1", "MURRAY2", "TUMUT1", "TUMUT2", "TUMUT3"],
        "unit_capacity_mw": {
            "MURRAY1": 950, "MURRAY2": 950,
            "TUMUT1": 116, "TUMUT2": 116, "TUMUT3": 250,
        },
    },

    # ── VIC ──────────────────────────────────────────────────────────────────
    "Loy Yang A": {
        "participant": "AGL Energy",
        "region": "VIC1",
        "fuel": "Coal",
        "technology": "Steam",
        "registered_capacity_mw": 2210,
        "duids": ["LYA1", "LYA2", "LYA3", "LYA4"],
        "unit_capacity_mw": {"LYA1": 560, "LYA2": 560, "LYA3": 545, "LYA4": 545},
    },
    "Loy Yang B": {
        "participant": "ENGIE",
        "region": "VIC1",
        "fuel": "Coal",
        "technology": "Steam",
        "registered_capacity_mw": 1000,
        "duids": ["LYAB1", "LYAB2"],
        "unit_capacity_mw": {"LYAB1": 500, "LYAB2": 500},
    },
    "Yallourn": {
        "participant": "EnergyAustralia",
        "region": "VIC1",
        "fuel": "Coal",
        "technology": "Steam",
        "registered_capacity_mw": 1480,
        "duids": ["YWPS1", "YWPS2", "YWPS3", "YWPS4"],
        "unit_capacity_mw": {"YWPS1": 370, "YWPS2": 370, "YWPS3": 370, "YWPS4": 370},
    },
    "Mortlake": {
        "participant": "Origin Energy",
        "region": "VIC1",
        "fuel": "Gas",
        "technology": "OCGT",
        "registered_capacity_mw": 566,
        "duids": ["MORTLK1", "MORTLK2"],
        "unit_capacity_mw": {"MORTLK1": 283, "MORTLK2": 283},
    },
    "Newport": {
        "participant": "AGL Energy",
        "region": "VIC1",
        "fuel": "Gas",
        "technology": "Steam",
        "registered_capacity_mw": 500,
        "duids": ["NEWPORT1"],
        "unit_capacity_mw": {"NEWPORT1": 500},
    },
    "Laverton North": {
        "participant": "ERM Power",
        "region": "VIC1",
        "fuel": "Gas",
        "technology": "OCGT",
        "registered_capacity_mw": 312,
        "duids": ["LAVNORTH1", "LAVNORTH2"],
        "unit_capacity_mw": {"LAVNORTH1": 156, "LAVNORTH2": 156},
    },
}

# Flat lookup: DUID → station metadata
DUID_MAP: dict = {}
for station, meta in GENERATORS.items():
    for duid in meta["duids"]:
        DUID_MAP[duid] = {
            "station": station,
            "participant": meta["participant"],
            "region": meta["region"],
            "fuel": meta["fuel"],
            "technology": meta["technology"],
            "capacity_mw": meta["unit_capacity_mw"].get(duid, 0),
        }

ALL_DUIDS = list(DUID_MAP.keys())

# Fuel type colour palette (for consistent chart colours)
FUEL_COLOURS = {
    "Coal": "#4A4A4A",
    "Gas":  "#F59E0B",
    "Hydro": "#3B82F6",
    "Wind": "#10B981",
    "Solar": "#F97316",
    "Battery": "#8B5CF6",
}
