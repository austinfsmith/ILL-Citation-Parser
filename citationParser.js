// CitationParser.js
// written in 2019 by Austin Smith, University of Maryland Libraries
//
// Uses XRegExp, so be sure to include the following line in your HTML:
// <script src="https://unpkg.com/xregexp/xregexp-all.js"></script>

// Common regex clauses
var author = "^(?<author>[A-Z](?:(?!$)[A-Za-z\u00C0-\u017F\\s&.,'’-])+)",
    year = "(?<year>\\d{4})",
    month = "(?<month>[A-Za-z]+)",
    volume = "(?<volume>\\d+)",
    issue = "(?<issue>\\d+(\/\\d+)*)", // also matches issue numbers like (3/4)
    journal = "(?<journal>.+?)",
    book = "(?<book>[^.]+)",
    article = "(?<article>.*?)\\.",
    chapter = "(?<chapter>.*?)",
    pages="(?<pages>\\d+[-–]\\d+)",
    doi="(?<doi>10\\.\\d{4,9}/[-._;()/:A-Za-z0-9]+)";

// The clauses above, combined according to various citation formats.
var regexes = {
  //"DOI": XRegExp(doi),
  "APA Article": XRegExp( author + "\\(" + year + "\\)\\.?\\s*" + article + "\\s*(?:" + journal + ",\\s*" + volume + "(?:\\(" + issue + "\\))?,\\s*" + pages + "?)\\.\\s*"+doi+"?"),
  "APA Chapter": XRegExp( author + "\\(" + year + "\\)\\.?\\s*" + chapter + "\\s*(?:In\\s*(?<editors>[^()]+))\\(Eds?\\.\\),\\s*" + book + "\\(\\D*" + pages + "?\\)?" ),
  "MLA Article": XRegExp( author + "\\s*[\“\"]" + article +"[\"\”]\\s*" + journal + ", vol.\\s*" + volume + "\\s*, nos?.\\s*" + issue + "?,\\s*(" + month + "\\.?)?\\s*?" + year + "\\D*" + pages + "?" ),
  "MLA Article (variant)": XRegExp( author + "\\s*[\“\"]" + article +"[\"\”]\\s*" + journal + "\\s*" + volume + "(\\." + "(?<issue>\\d+(/\\d+)*))?" + "\\s*\\(" + year + "\\):\\s*" + pages),
  "MLA Chapter": XRegExp( author + "\\s*[\“\"]" + chapter +"[\"\”]\\s*" + book + ",\\s*edited by\\s*(?<editor>.*?),\\s*(?<publisher>.*?),\\s*"+year+"\\D*" + pages + "?" ),
  "Chicago Article": XRegExp( author + "\\s*[\“\"]" + article +"[\"\”]\\s*" + journal + volume + ",\\s*no.\\s*" + issue + "\\s*\\(" + year + "\\):\\s*" + pages + "?" ),
  "Chicago Chapter": XRegExp( author + "\\s*[\“\"]" + chapter +"[\"\”]\\s*[Ii]n\\s*" + book + ",\\s*\\(?\\D+" + year + "\\):\\s*" + pages + "?" ),
  "Chicago Chapter (variant)": XRegExp( author +"\\s*[\“\"]" + chapter +"[\"\”]\\s*[Ii]n\\s*" + book + ".\\D+" + year + "" ),

  "APA Book": XRegExp( author + "\\(" + year + "\\)\\.?\\s*" + book + "."),
  "MLA Book": XRegExp( author + "\\.\\s*" + book + "\\.\\D+" + year)
}

// Short function to avoid errors on nonexisting fields.
function setField(field, value) {
	if (field) { field.value = value; }
}

function ParseCitation(){

	// The form fields we'll be populating.
	// Add some redundancies so this will work on loan, chapter, and article request forms.
	journal_title_field = document.getElementById("PhotoJournalTitle") || document.getElementById("LoanTitle");
	book_author_field = document.getElementById("PhotoItemAuthor") || document.getElementById("LoanAuthor");
	place_field = document.getElementById("PhotoItemPlace") || document.getElementById("LoanPlace");
	publisher_field = document.getElementById("PhotoItemPublisher") || document.getElementById("LoanPublisher");
	edition_field = document.getElementById("PhotoItemEdition") || document.getElementById("LoanEdition");
	volume_field = document.getElementById("PhotoJournalVolume");
	issue_field = document.getElementById("PhotoJournalIssue");
	year_field = document.getElementById("PhotoJournalYear") || document.getElementById("LoanDate");
	month_field = document.getElementById("PhotoJournalMonth");
	page_field = document.getElementById("PhotoJournalInclusivePages");
	article_author_field = document.getElementById("PhotoArticleAuthor");
	article_title_field = document.getElementById("PhotoArticleTitle");
	issn_field = document.getElementById("ISSN");
	doi_field = document.getElementById("DOI");

	// clean up the citation (remove tabs, newlines, extra spaces)
	var citation = document.getElementById('citation-field').value
	citation = citation.replace(/\n/g, " ");
	citation = citation.replace(/\t/g, " ");
	citation = citation.replace(/ +(?= )/g,'');

	// test citation against regexes until a match is found.
	var match = Object.keys(regexes).some(function(regex_name) {
		result = XRegExp.exec(citation, regexes[regex_name]);
		if (!(result==null)){
		FillFormFromCitation(result);
		//document.getElementById("CitationType").value = regex_name
		if (result.doi) { ResolveDOI(result.doi); }
		return true;
		}
	})

	// if no match is found, report the error.
	if (!match) {
		//document.getElementById("errorText").innerHTML = "Citation Error ";
	}
}

// Request JSON metadata for an article using its DOI.
function ResolveDOI(doi){
  doi = doi.replace("http:","https:").replace(" ","").replace("dx.doi.org","doi.org");
  if (doi.substr(-1) == "."){ doi = doi.substr(0, doi.length - 1); }
  var doi_url = (doi.includes("https://doi.org/")) ? doi : "https://doi.org/" + doi;

  var xmlhttp = new XMLHttpRequest();
    xmlhttp.onloadend = function() {
      if (xmlhttp.status == 200) {
        FillFormFromJSON(JSON.parse(this.responseText));
        return true;
      } else if (xmlhttp.status == 404) {
        document.getElementById("errorText").innerHTML += " DOI Error";
      }
    };
  xmlhttp.open("GET", doi_url, true);
  xmlhttp.setRequestHeader("Accept", "application/vnd.citationstyles.csl+json")
  xmlhttp.send();
}

// Fill out form fields with named match group data from a regular expression.
// At present, some of these will always be null.
// This may change if/when the regexes are improved.
function FillFormFromCitation(result) {
	//console.log(result)
	setField(journal_title_field, result.journal || result.book || null);
	setField(book_author_field, result.author || null);
	setField(place_field, result.place || null);
	setField(publisher_field, result.publisher || null);
	setField(edition_field, result.edition || null);
	setField(volume_field, result.volume || null);
	setField(issue_field, result.issue || null);
	setField(year_field, result.year || null);
	setField(month_field, result.month || null);
	setField(page_field, result.pages || null);
	setField(article_author_field, result.author || null);
	setField(article_title_field, result.article || result.chapter || null);
	setField(issn_field, result.issn || null);
	//setField(doi_field, result.doi || null);
}

// Fill out form fields with JSON data retrieved from a DOI registrar.
function FillFormFromJSON(citation_json){

	var author_list = new Array();
	citation_json.author.forEach( function(auth) {
		author_list.push(auth.given + " " + auth.family);
	})
	authors = author_list.join(", ");

  	setField(journal_title_field, citation_json["container-title"] || null);
	setField(book_author_field, authors || null);
	setField(place_field, result.place || null);
	setField(publisher_field, result.publisher || null);
	setField(edition_field, result.edition || null);
	setField(volume_field, citation_json.volume || null);
	setField(issue_field, citation_json.issue || null);
	setField(year_field, citation_json.issued["date-parts"][0][0] || null);
	setField(month_field, citation_json.issued["date-parts"][0][1] || null);
	setField(page_field, citation_json.page || null);
	setField(article_author_field, result.author || null);
	setField(article_title_field, citation_json.title || null);
	setField(issn_field, citation_json.ISSN[0] || null);
}

function ClearFields(){
  var elements = document.getElementsByTagName("input");
  for (var ii=0; ii < elements.length; ii++) {
    if (elements[ii].type == "text") {
      elements[ii].value = "";
    }
  }
  document.getElementById('citation').value = "";
  document.getElementById("errorText").innerHTML = ""
}
