#!/usr/bin/env python3
# Dev-only: list which shared identifiers a line-range of App.jsx references,
# so the extracted page file gets the right import header.
import sys, re
start, end = int(sys.argv[1]), int(sys.argv[2])
b = '\n'.join(open('src/App.jsx').read().split('\n')[start-1:end])
checks = {
 'useState': r'\buseState\b', 'useMemo': r'\buseMemo\b', 'useEffect': r'\buseEffect\b',
 'createPortal': r'\bcreatePortal\b',
 'I': r'<I |\bI n=', 'useAuth': r'\buseAuth\b', "can(": r'\bcan\(', 'NO_PERM': r'\bNO_PERM\b',
 'Pill': r'<Pill\b', 'Tag': r'<Tag\b', 'ActiveBadge': r'<ActiveBadge\b',
 'thDate': r'\bthDate\b', 'daysTo': r'\bdaysTo\b', 'prog': r'\bprog\b', 'lawBEYear': r'\blawBEYear\b',
 'beYearFromDate': r'\bbeYearFromDate\b', 'TH_MONTHS': r'\bTH_MONTHS\b', 'CAT_COLORS': r'\bCAT_COLORS\b',
 'nextCode': r'\bnextCode\b', 'dupCheck': r'\bdupCheck\b', 'normName': r'\bnormName\b',
 'LAW_TYPES': r'\bLAW_TYPES\b', 'STATUS': r'\bSTATUS\b', 'RECURRENCE_LABELS': r'\bRECURRENCE_LABELS\b',
 'Attachments': r'<Attachments\b', 'exportLawsToExcel': r'\bexportLawsToExcel\b',
 'confirmDialog': r'\bconfirmDialog\b', 'toast': r'\btoast\b', 'currentUserName': r'\bcurrentUserName\b',
 'uploadLawDoc': r'\buploadLawDoc\b', 'suggestionLists': r'\bsuggestionLists\b',
 'StageBar': r'<StageBar\b', 'CaseStepper': r'<CaseStepper\b', 'groupCases': r'\bgroupCases\b',
 'effStatus': r'\beffStatus\b', 'isOverdueItem': r'\bisOverdueItem\b',
}
print(','.join(k for k, p in checks.items() if re.search(p, b)))
