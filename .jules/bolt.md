## 2026-11-04 - [DOM updates and Array Allocation]
**Learning:** Frequent innerHTML updates for identical DOM structure in the main render loop causes layout thrashing and unnecessary repaints. Also, array manipulation routines like .map and .concat in render critical paths increases GC pressure.
**Action:** Always check the diffs before applying innerHTML (e.g. data-html cache). Always modify arrays using forEach with side-effects instead of generating intermediate arrays during loops.
