# Repeat-question groups: held-out sample

Criterion: do all the shown questions in the group ask the same thing? Strict: related-but-different counts as no. Sample: `SEED=123 node scripts/sample-corpus.mjs clusters 10`.

**Result: 12 / 33 = 36%**

One annotator. Every judgment is below so anyone can re-check it. Excerpts are truncated; user names are the dataset's pseudonyms.


### racket C0 (n=2): **yes**
- Q: have a super noob `raco` question but the docs don't help me. How do I get `raco setup` to install dependent packages from `info.rkt`?
- Q: have a question about `raco setup`: I work on small programs that aren’t packages per se, they’re CLI tools. Is there a way to use `raco setup` to install the deps from `

### racket C1 (n=2): **no**
- Q: re the "tan boxes" in docs -- that say e.g. `(require foo) package: foo-lib` -- is there a plan for `foo-lib` to be a hyperlink back to the package server?
- Q: I understand the reasoning for splitting a package `foo` into `foo-lib` (= to reduce build dependencies). But many packages also have a `foo-doc` subpackage, so `foo` ins

### racket C2 (n=2): **no** (related (testing multiple values) but different questions)
- Q: what is the proper way to test a function returning multiple values? The following seems very weird to me.. #lang racket/base (require rackunit) (define (f x) x) (define
- Q: Currently `check-equal?` is a function-like check form, which means it evaluates its arguments in the same way a function would. The `check-equal?/values` form needs to b

### clojurians C0 (n=2): **no**
- Q: does anyone here have any experience using clj-http with cookies on an HTTP/POST? I’m trying to convert a request over from using [http.async.client “1.2.0”] to clj-http
- Q: How can a make a request like this in clojure ```curl -X POST -d @sample.json http://example.com/api --header "Content-Type: application/json" --header "Accept: applicati

### clojurians C1 (n=2): **yes**
- Q: What's the correct syntax to pass --add-modules java.xml.bind to 'clj' ?
- Q: Hi does anyone know how to pass jvm-opts to the clj from terminal? specifically how do i pass ‘--add-modules java.xml.bind’ ?

### clojurians C2 (n=2): **no**
- Q: Is there any way to determine in custom macro whether passed symbol is macro or function?
- Q: should I use `*ns*` to get the qualified symbol in macro? like `(my-macro (+ 1 2))`, I want `+` as `clojure.core/+`.

### clojurians C3 (n=2): **yes**
- Q: I am trying to connect to remote nrepl server, I am running OSX and server is ubuntu. How can I use ssh port forwarding to make it work? ✗ ssh -L 7000:theserver:7000 loca
- Q: I have a clojure nrepl server running on an ubutnu server , but I cannot remotly connect via nrepl. Probably the port is blocked. Is there a way I can use my ssh connecti

### clojurians C4 (n=2): **yes**
- Q: When is the 2017 Clojure survey?
- Q: is there any updates about results of clojure annual survey 2017?

### clojurians C5 (n=2): **yes** (repost by the same person)
- Q: Has anyone seen "This ResultSet is closed" errors from heroku (or anywhere else)? I am using jetty with with-db-connection. I have one instance that works and other (more
- Q: (repost) Has anyone seen "This ResultSet is closed" errors from heroku (or anywhere else)? I am using jetty with with-db-connection. I have one instance that works and ot

### clojurians C6 (n=2): **no**
- Q: is anyone using cognitect’s aws-api library?
- Q: Hi. How can i use com.cognitect.aws/email to use email on AWS?

### clojurians C7 (n=2): **no**
- Q: what's the explain for this, what's the difference between these two?
- Q: what's the difference between `with-bindings` and `binding`?

### clojurians C8 (n=2): **yes**
- Q: What is equivalent of `lein deps` with `clj` and deps.edn? I want to resolve and download dependencies but not run anything (yet).
- Q: Using the build in `clojure` cli is there a way to make it download all the deps? The equivalent of `lein deps`?

### clojurians C9 (n=2): **no**
- Q: hi clojure. is there a trick to using gen-class?
- Q: Any way to trick gen-class in running at runtime?

### pythondev C0 (n=2): **yes**
- Q: what's the best way to mock a method on a mock object?
- Q: Hey guys! I'm trying to write tests to mock a object in a method like this: ``` def something(): a = method1() b = a.method2() ``` How can I stub `method1` to return a mo

### pythondev C1 (n=2): **no**
- Q: Are there any thread safe collections in Python?
- Q: Is there a way i can check my code is Thread Safe?

### pythondev C2 (n=2): **no**
- Q: Hi, what's the best python IDE for a newbie?
- Q: Which is the channel for IDE-specific questions?

### pythondev C3 (n=2): **no**
- Q: what's the exact error? I didn't have an issue doing this in the shell
- Q: what's the exact error?

### pythondev C4 (n=2): **yes** (exact duplicate post)
- Q: Hi guys how do I mock this whole function: ``` def clean_file(filename): """ Method to clean ASRCoPP XML file which is in .gz format Args: filename (str): Compressed ASRC
- Q: Hi guys how do I mock this whole function: ``` def clean_file(filename): """ Method to clean ASRCoPP XML file which is in .gz format Args: filename (str): Compressed ASRC

### pythondev C5 (n=2): **yes**
- Q: Does anyone have any experience with scapy/reading packets manually?
- Q: Guys...anyone having experience with scapy here ?

### pythondev C6 (n=2): **no**
- Q: I currently have a colour enum that has a predefined set of standard colours however rarely a custom colour is given that isn't defined in the enum is it possible for the
- Q: I’m using `from enum import Enum` anyone have a simple way to write an exhaustive `switch` on my `Enum`?

### pythondev C7 (n=2): **no**
- Q: Hi guys can someone explain me whats the difference between
- Q: what is the difference between `and` and `&` in Python?

### pythondev C8 (n=2): **no**
- Q: Hey all, I just downloaded a project with a virtual environment, when I activate it, and try to run it, the pip from the virtual env is not the one in use. Is there a way
- Q: how to activate virtual env inside a shell script?

### pythondev C9 (n=2): **no** (related (pytest fixtures) but different questions)
- Q: Hello, I have one question which relate to `pytest` for example, I used one `fixture` for all my test cases, but for one test case I don’t need use a `fixture` how I to s
- Q: Anyone know how I can stop a single_test_case from being ran in pytest if a fixture for that test_case failed?

### elmlang C0 (n=2): **yes**
- Q: is there a way to unexpose something from `Basics` module? I have an `Data.Order` data type, which conflicts with `Basics.Order` when imported at top level. In modules wh
- Q: Is it possible to alias a type when importing it? I have a type called `Order` which conflicts with Basics. Something like `import Data.Order exposing (Order as MyOrder)`

### elmlang C1 (n=3): **no**
- Q: Making http request in Elm, what do use?
- Q: folks, I am making an http request and the response can be either `{"result" : "ok"}` or `{"error" : "Error reason"}` how can this be handled in the Http.expectJson in Ht
- Q: So can I pass on an Http.request to my Http.get ?

### elmlang C2 (n=2): **no** (both about SVG attributes; different specifics)
- Q: Hello. How do I add custom attributes to Svg?
- Q: in svg https://package.elm-lang.org/packages/elm/svg/1.0.0/ what is the type of the attributes? how can i add something that will recalculate the svg coordinates to a nor

### elmlang C3 (n=2): **no**
- Q: Hello. When I am using Task.andThen, how can I see response from the first task?
- Q: I've got a: `a -> b -> Task x c` nested really low, and `b` is something that's passed down through every level. The task is then mapped up to the root. how do I pass `b

### elmlang C4 (n=2): **no** (both about decoding null; different specifics)
- Q: how to json decode null into (), like this? `(null ())`
- Q: if i have a js object that is null or undefined. { body: ? } I want Nothing if is null or undefined, and i want JD.value otherwise. How to construct the decoder? `JD.fiel

### elmlang C5 (n=2): **yes**
- Q: hey! for some reason my time travel debugger stopped popping up at app start at some point... i still `use elm-make --debug` is there a way to start it from console or so
- Q: how can i see the time travel debugger now?

### elmlang C6 (n=2): **yes** (exact duplicate post)
- Q: In the elm roleplaying tutorial, I want one of my messages to change the current URL, how do I do that?
- Q: In the elm roleplaying tutorial, I want one of my messages to change the current URL, how do I do that?

### elmlang C7 (n=2): **no**
- Q: Howdy folks - is package.elm-lang.org down for anyone else?
- Q: GitHub down for anyone else?

### elmlang C8 (n=2): **no**
- Q: Is it an equivalent to the Haskell's syntax `f x@(Just a) =...` (for type with only one constructor) ?
- Q: Does anyone know the equivalent of Haskell's `undefined`?

### elmlang C9 (n=2): **no**
- Q: What does this do in elm `=>` is it notation for batch commands?
- Q: Folks, is there any way to update a model using .x notation?
