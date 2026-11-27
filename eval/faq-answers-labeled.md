# Wiki answers: held-out sample

Criterion: does the chosen reply actually answer the question? Partial pointers count as yes only if a reader could act on them. Sample: `SEED=777 node scripts/sample-corpus.mjs faq 10`.

**Result: 18 / 33 = 55%**

One annotator. Every judgment is below so anyone can re-check it. Excerpts are truncated; user names are the dataset's pseudonyms.


### racket F0 (asked=2): **yes**
- Q: have a super noob `raco` question but the docs don't help me. How do I get `raco setup` to install dependent packages from `info.rkt`?
- A: @Sandi you need to install them as packages

### racket F1 (asked=2): **no**
- Q: re the "tan boxes" in docs -- that say e.g. `(require foo) package: foo-lib` -- is there a plan for `foo-lib` to be a hyperlink back to the package server?
- A: Why not make the docs part of the main `foo` package? Some packages do do that. That’s what `binaryio`, `gmp`, `scribble-code-examples`, `sweet-exp`, and `zeromq-r` do.

### racket F2 (asked=2): **yes**
- Q: is there a way to support `response` from `(require web-server/http/response-structs)` in typed/racket? I tried wrapping the struct in an opaque `require/typed` using `ca
- A: @Jana typed racket comes with types for the `header` and `response` structs. They're available by `(require typed/web-server/http)`. The docs are sparse but anyway: https://docs.racket-lang.org/ts-reference/Libraries_Pro

### clojurians F0 (asked=2): **yes**
- Q: I have tried .size, .length, .-length how do I get, in O(1) time, the length of a (float-array n) ?
- A: @Everette `count` will work...

### clojurians F1 (asked=2): **no**
- Q: Is there any way to determine in custom macro whether passed symbol is macro or function?
- A: You want to use syntax quoting in this case ``` `x => clojure.core/+ '+ => x ```

### clojurians F2 (asked=2): **no** (answer belongs to a different conversation (dataset grouping))
- Q: does anyone have any idea how to encode the `::selection` selector in `garden` ?
- A: cljr for Clojure CLR

### clojurians F3 (asked=2): **yes**
- Q: What's the correct syntax to pass --add-modules java.xml.bind to 'clj' ?
- A: or just ```-Jopt Pass opt through in java_opts, ex: -J-Xmx512m```

### clojurians F4 (asked=2): **yes** (answers the status (results delayed), not a date)
- Q: When is the 2017 Clojure survey?
- A: no, sorry - pto from several of us has delayed progress on posting the results

### clojurians F5 (asked=2): **yes**
- Q: I’ve never seen a `deref` used like this before. What does it mean? ```@(def sample-data (->> (for [color colors size sizes type types] {:inv/color color :inv/size size :
- A: the def returns a var, and deref, when applied to a var, "returns its current state"- so say the docs.

### clojurians F6 (asked=2): **yes**
- Q: is it possible to get the name of an anonymous function? like `(fn foo [x] (x + 42))`
- A: @Leontine You can do `(fn my-function [...] ...)` and `my_function` will show up in the stacktrace. (Also useful for writing recursive functions, because you can refer to `my-function` in the function body.)

### clojurians F7 (asked=2): **no**
- Q: Hi! Is there a short form for something like `(update coll #(map (fn [item] (if (condition item) (modify item) item)) %))`? Something like a `:when` for updating a collec
- A: @Roberto what kind of items do you store in the sorted map?

### clojurians F8 (asked=2): **yes**
- Q: Any example on how to refresh `~/.clojure/deps.edn` and put some exclusions in packages??
- A: @Otilia: like so ``` com.cognitect/transit-clj {:mvn/version "0.8.300" :exclusions [org.javassist/javassist]} ```

### clojurians F9 (asked=2): **yes**
- Q: Why is it that I can use my Java class directly i.e. (com.my.Class. params), but if I try to (require '[com.my]), I get "could not locate com/my__init.class"?
- A: @Valene @Alease that'd be Clojure, not the JVM. look at `clojure.core/root-resource`, `clojure.core/load` and of course `RT/load` ``` user=> (#'clojure.core/root-resource 'my.great.namespace) "/my/great/namespace" ```

### pythondev F0 (asked=2): **no**
- Q: Hi guys, I'm planning to create a mail distribution system using `smtplib` is there any points that I need to consider? Looking at the tutorial is pretty straightforward,
- A: `from script import *` imports literally everything from a module, it is also considered bad practise. `import script` I think gives a reference for which you can import what you need, though could be wrong on that last

### pythondev F1 (asked=2): **no**
- Q: how do i insert blank row on row num 2(1 being the table header) in excel sheet ? which library should help here ? i have been using openpyxl for other excel task
- A: The best library ever! :-D

### pythondev F2 (asked=2): **no**
- Q: what's the exact error? I didn't have an issue doing this in the shell
- A: @Jeanelle Highly recommend pythex.org

### pythondev F3 (asked=2): **yes**
- Q: Hello, I have one question which relate to `pytest` for example, I used one `fixture` for all my test cases, but for one test case I don’t need use a `fixture` how I to s
- A: mmm, looks this is possible: https://docs.pytest.org/en/2.9.0/skipping.html#imperative-xfail-from-within-a-test-or-setup-function

### pythondev F4 (asked=2): **yes**
- Q: I'm trying to import from the same directory. My directory is marked as "Sources root" but my imports still cant find what they need from my first script. Anyone see what
- A: you need to do `from <specific file> import db`

### pythondev F5 (asked=2): **no**
- Q: how can I remove the first key in that dictionary?
- A: Heh heh. Well, (a) I don't think you can put dicts into sets, since they aren't hashable, (b) even if you could, eliminating duplicates might not be desired, (c) you'd still need to iterate over the set to check each dic

### pythondev F6 (asked=2): **yes**
- Q: Hi, I am trying to write a lambda function where I need to pass api_key value, but I don't want to pass that value as a hard code in script. that value I wanted to pull f
- A: we are suggesting that you place your API key in environment variables, I think this is super standard practice, but you keep saying you have to call an API to get the api key… so I am trying to figure out what you mean

### pythondev F7 (asked=2): **no**
- Q: How would one suggest getting the next dict obj in a list of dicts? i.e. -> [dict1{key="x", key="y"}, dict2{key=x, key=y}] ?
- A: If it's valid JSON, you can parse it w/ the `json` library and then convert that to a CSV with the `csv` library

### pythondev F8 (asked=2): **no**
- Q: so? anyone was working on google colaboratory with google drive/pydrive? i want to do it, but i'm lost...
- A: Can you maybe use the google drive API ?

### pythondev F9 (asked=2): **no**
- Q: Are there any thread safe collections in Python?
- A: from wikipedia > Thread safety is a computer programming concept applicable to multi-threaded code. Thread-safe code only manipulates shared data structures in a manner that ensures that all threads behave properly and f

### elmlang F0 (asked=2): **no** (answer belongs to a different conversation (dataset grouping))
- Q: how can I use “:Elm” emoji in another Slack workspace?
- A: I am trying to use the list from `eeue56/elm-lazy-list`. I want to do something similar to `Random.list` but I don't know how long the lists will be in advance.

### elmlang F1 (asked=2): **no**
- Q: does anyone know how to write a generic function? For instance to convert an elm type to a user define type?
- A: You could even write that in Elm(which proves that it's pure I think) ``` a2 : (a -> b -> c) -> a -> b -> c a2 fun a b = fun a b ```

### elmlang F2 (asked=2): **no** (answer belongs to a different conversation (dataset grouping))
- Q: Hello, I would like to listen for the ‘wheel’ even on the window. If I understand correctly I can do that with the `onWindow` function from the Dom.LowLevel package: http
- A: so I have this type ``` type alias IndividualEnvData = { mailgun_domain : String , amazon_s3_bucket_name : String , recaptcha_public_key : String , recaptcha_private_key : String ```

### elmlang F3 (asked=2): **no** (answer belongs to a different conversation (dataset grouping))
- Q: what is best way to remove spaces from string ?
- A: Does anyone have any experience creating a modal dialog at all? I've found https://package.elm-lang.org/packages/krisajenkins/elm-dialog/latest/ which looks the most promising but the demos don't work and there is no men

### elmlang F4 (asked=3): **yes** (explains the error rather than giving the fix)
- Q: I'm trying to use `case of` to render different button types for two different values of a variable state and render nothing for all other values of state but I'm getting
- A: All of these will cause the "The 2nd and 3rd branches of this `case` produce different types of values" error :slightly_smiling_face:

### elmlang F5 (asked=2): **yes**
- Q: hey, i want to start learning elm; what would be the proper way to start ?
- A: Elm In Action is a great book to start. It has simple language and much reasoning. You will start with a simple app and will be adding features to it throughout the book to introduce different language abilities and tech

### elmlang F6 (asked=2): **yes**
- Q: Hey, is there any way of getting the x and y location of an Svg.onClick event?
- A: @Lawanna you can use `Svg.Event.on "click"` with a custom decoder

### elmlang F7 (asked=2): **yes**
- Q: Hello. When I am using Task.andThen, how can I see response from the first task?
- A: `firstTask \|> Task.andThen (\first -> secondTask first \|> Task.map (\second -> (first, second)))`

### elmlang F8 (asked=2): **yes**
- Q: Is there a package that formats Int with a number of leading zeros (like excel masks) ?
- A: I think you could do something like `String.padLeft 3 '0' << String.fromInt` :thinking_face:

### elmlang F9 (asked=2): **yes**
- Q: hi! Anyone knows how I can catch a file upload progress from an `Http.Request`? `Http.Progress.track` is only for download progress unfortunately :disappointed:
- A: @Mckinley There is a `Http.Progress` module that seams to have some facilities for progress based requests. Maybe that works for POST requests too.
