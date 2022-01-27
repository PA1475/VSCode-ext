## GIT
Under utvecklingens gång kommer vi använda git och github.
Vi kommer använda oss av varsin separat fork, dvs alla medlämmar äger en kopia av kodbasen. Detta är egentligen inte nödvändigt då alla medlemmar i teamet har tillgång till huvud-kodbasen. Fördelen är dock att vi implementerar kod genom pull-requests, vilket innebär att vi får mer kontroll över kodbasen. Vi kommer också träna på att jobba i ett open-scource projekt vilket är en viktig kunskap.

**Strategi**
1. pusha inte till main
2. dev branchen är alla nya features inte helt testade
3. gör en ny branch från dev för varje nu feature eller story
4. Slå ihop komponenter från dev till main

**Begrepp**
- upstream: rekommenderat namn på den centrala kodbasen
- origin: rekommenderat namn på din kopia av den centrala kodbasen.


### Scenarior samt lösningar
**Hur håller jag upstream och origin synkade?**
Börja med att fetcha upstream, ändringarna kommer då sparas i en branch kallat upstream/main t.ex. Merga sedan denna branchen till din din motsvarande branch.
```
git fetch upstream master
git checkout master
git diff  # för att se ändrningar
git merge upstream/master
# alternativt
git
```
Detta tar alltså ändringar som nån annan gjort och slår ihop dem till ditt lokala repository.

---
**Hur ser processen ut när jag ska utveckla en feature?**
```
git branch -b feature_branch_name
# edit, create or delete some files
git add file
git commit -m "Describe your change"
git push origin feature_branch_name
```
Efter detta kan en pull request skapas på github

---
**Jag har börjat utveckla en feature på fel branch!**
Dessa kommandon kan användas för att flytta ändringar på untrackade filer till en annan branch.
```
git stage
git checkout branch_name
git stage pop
```

---

## Kod
Redigera inte rader i onödan, detta för att undvika merge konflikter.
Ska kodel lintas?
Vilken kodstil ska vi använda? CamelCase eller snake_case


---

## Scrum
