#!/usr/bin/env python3
# Dev-only: flag shared/library identifiers used in a file but not imported or
# locally defined. Catches refactor mistakes the bundler ignores (runtime ReferenceError).
import sys, re
EXTERNAL = [
 'useState','useEffect','useMemo','useRef','useContext','useCallback','createPortal',
 'usePersist','prog','lawBEYear','thDate','daysTo','beYearFromDate','TH_MONTHS',
 'Pill','Tag','ActiveBadge','CAT_COLORS','withCatColors','nextCode','normName','dupCheck',
 'useAuth','NO_PERM','ROLE_LABELS','currentUserName','AuthContext',
 'STATUS','LAW_TYPES','RECURRENCE_LABELS','advanceByRecurrence','uploadLawDoc','suggestionLists',
 'I','Attachments','StageBar','CaseStepper','groupCases','effStatus','isOverdueItem',
 'toast','confirmDialog','exportLawsToExcel','buildReport',
]
for path in sys.argv[1:]:
    src = open(path).read()
    # imported names: grab everything inside import {...} plus default import idents
    imported = set()
    for m in re.finditer(r'import\s+(?:(\w+)\s*,\s*)?\{([^}]*)\}\s+from', src):
        if m.group(1): imported.add(m.group(1))
        for part in m.group(2).split(','):
            n = part.strip().split(' as ')[-1].strip()
            if n: imported.add(n)
    for m in re.finditer(r'import\s+(\w+)\s+from', src):
        imported.add(m.group(1))
    # locally defined (function X / const X / let X)
    local = set(re.findall(r'(?:function|const|let|var)\s+(\w+)', src))
    body = src
    missing = []
    for name in EXTERNAL:
        if name in imported or name in local:
            continue
        if re.search(r'(?<![\w.])' + re.escape(name) + r'\b', body):
            missing.append(name)
    tag = 'OK  ' if not missing else 'MISS'
    print('%s %s%s' % (tag, path, '' if not missing else '  -> ' + ', '.join(missing)))
