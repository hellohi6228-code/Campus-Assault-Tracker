# Campus Assault Tracker

A static website that maps and catalogs documented sexual-assault and abuse cases at US colleges. It has a heat map, rankings (by settlements and fines, by survivors reported, and by state), and a searchable list of cases. Each case shows its current status and links to its sources.

## Run it
It's plain HTML with no build step. Open `index.html`, or publish it with GitHub Pages (Settings → Pages → deploy from this branch, root folder).

## Add or edit a case
Edit `data/cases.js`. Every entry needs at least one published source (news reporting, court records, or government findings).

## Data policy
- **Survivors are never named.**
- **Individuals are named only if convicted in criminal court**, or if deceased and the subject of criminal charges or a university-commissioned investigation.
- **People who are only accused are not named**, and **no photos of any individual are published.** Accusations are sometimes wrong (see the Duke and UVA entries). Publishing unproven accusations also exposes the maintainers to defamation liability.
- The numbers show which cases were documented and reported. They are **not** a measure of how common assault is on any campus. For per-campus counts of reported offenses, see the US Department of Education's [Clery data](https://ope.ed.gov/campussafety/).

Support: RAINN, 800-656-HOPE (4673), https://rainn.org
