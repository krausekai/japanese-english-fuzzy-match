/*
	MIT License
	Copyright (c) 2017 Kai Krause <kaikrause95@gmail.com>
	See license here: https://github.com/krausekai/japanese-english-fuzzy-match/blob/master/LICENSE.txt
	------------------------------------
	This code is based on research from:
	https://www.tm-town.com/blog/the-fuzziness-of-fuzzy-matches
	https://en.wikipedia.org/wiki/Levenshtein_distance
*/

// 0 to 100% (0 no match, 100 perfect match)
var tokenizer = new TinySegmenter();
function fuzzyMatch (s1, s2) {
	// Detect the input language
	var language;
	if (/[a-zA-Z]/.test(s1)) {
		language = "en";
	} else {
		language = "ja";
	}

	// Remove punctuation and numbers
	if (language == "en") {
		s1 = s1.toLowerCase().replace(/[^\w\s]|[\d]/gm, '');
		s2 = s2.toLowerCase().replace(/[^\w\s]|[\d]/gm, '');
	} else if (language == "ja") {
		s1 = s1.replace(/[\u3000-\u303f]|[\uff00-\uff9f]|[`~!@#$%^&*()_\-+=\]\[}{';":\/?.>,<]|[\d]/gm, '');
		s2 = s2.replace(/[\u3000-\u303f]|[\uff00-\uff9f]|[`~!@#$%^&*()_\-+=\]\[}{';":\/?.>,<]|[\d]/gm, '');
	}

	//if both strings are the same, return 100
	if (s1 == s2 ) {
		return 100;
	}

	// Total count of matches
	var count = 0.0;

	//Tokenize 'str1' and 'str2' as an Array
	var s1tokens = tokenizer.segment(s1);
	var s2tokens = tokenizer.segment(s2);

	// Remove tokenized whitespaces...
	s1tokens = s1tokens.filter(function(str) {
		return /\S/.test(str);
	});
	s2tokens = s2tokens.filter(function(str) {
		return /\S/.test(str);
	});

	// Make a duplicate of the arrays to work with, incase we need to revert
	var longer = [];
	var shorter = [];
	if (s1tokens.length < s2tokens.length) {
		longer = longer.concat(s2tokens);
		shorter = shorter.concat(s1tokens);
	} else {
		longer = longer.concat(s1tokens);
		shorter = shorter.concat(s2tokens);
	}

	//Early out if the two array lengths are too different for effeciency!
	// eg. StrA is 10, StrB is 25, the diff is 15
	var numDiff = Math.abs(shorter.length - longer.length);
	if (numDiff > shorter.length) {
		return 0;
	}

	// Remove stopwords
	// http://www.ranks.nl/stopwords http://www.lextek.com/manuals/onix/stopwords1.html http://geeklad.com/remove-stop-words-in-javascript
	// Incorporate punctuation of ' inside these, then bring down the above whitespace filterer to be both a whitespace AND punctuation filterer for English, after stopword removal
	var engStopWords = ["a", "about", "above", "after", "again","against", "all", "am", "an", "and", "any", "are", "arent", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "cant", "cannot", "could", "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during", "each", "few", "for", "from", "further", "had", "hadnt", "has", "hasnt", "have", "havent", "having", "he", "hed", "hell", "hes", "her", "here", "heres", "hers", "herself", "him", "himself", "his", "how", "hows", "i", "id", "ill", "im", "ive", "if", "in", "into", "is", "isnt", "it", "its", "its", "itself", "lets", "me", "more", "most", "mustnt", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "this", "that", "there", "the", "those", "they", "we", "us", "them", "in", "to", "who", "which", "what", "she", "shed", "shes", "since", "by", "also", "however", "but", "although", "left", "right", "up", "down", "go", "you", "will", "if", "let", "try"];
	var jpStopWords = ["これ", "それ", "あれ", "この", "その", "あの", "ここ", "そこ", "あそこ", "こちら", "どこ", "だれ", "なに", "なん", "何", "私", "貴方", "貴方方", "我々", "私達", "あの人", "あのかた", "彼女", "彼", "だ", "です", "ある", "あります", "おります", "いる", "います", "は", "が", "の", "に", "へ", "を", "で", "から", "まで", "より", "も", "どの", "と", "し", "それで", "しかし", "でも", "また", "思う", "思います", "よね", "ね", "じゃ", "ない", "じゃない", "ありません", "いません", "いない", "な", "について", "ついて", "関", "後", "に対して", "対して", "すべて", "全て", "全部", "そして", "さらに", "そしたら", "それから", "できる", "できます", "できない", "できません", "だろう", "でしょう", "する", "した", "します", "しました", "彼ら", "彼たち", "僕たち", "俺たち", "俺達", "僕達", "我ら", "俺ら", "私たち", "お前","いいえ","いや","上","下","右","左", "中", "それぞれ", "別", "他", "自分", "って", "・", "行く", "行きます", "あなた", "貴方", "ください", "下さい", "お願いします", "お願い"];

	if (language == "en") {var stopWords = engStopWords} else {var stopWords = jpStopWords}

	//remove stopwords from s1
	for (var token = 0; token < shorter.length; ++token) {
		if (stopWords.indexOf(shorter[token]) > -1) {
			shorter.splice(token, 1);
			token--;
		}
	}

	//remove stopwords from s2
	for (var token = 0; token < longer.length; ++token) {
		if (stopWords.indexOf(longer[token]) > -1) {
			longer.splice(token, 1);
			token--;
		}
	}

	// Adjust lengths
	var tmpShorter = shorter;
	var tmpLonger = longer;
	if (longer.length < shorter.length) {
		longer = tmpShorter;
		shorter = tmpLonger;
	}

	// If either array contains no elements, then compare the strings with stop words anyway
	if (shorter.length == 0 || longer.length == 0) {
		if (s1tokens.length < s2tokens.length) {
			longer = s2tokens;
			shorter = s1tokens;
		} else {
			longer = s1tokens;
			shorter = s2tokens;
		}
	}

	// Then check for unique matches word-by-word
	if (language == "en") {maxDist = 2;} else if (language == "ja") {maxDist = 2}
	for (var token = 0, len=shorter.length; token < len; ++token) {
		for (var token2 = 0, len2=longer.length; token2 < len2; ++token2) {

			var dist = editDistance(longer[token2], shorter[token]);
			if (longer[token2].length < shorter[token].length) {
				longerMatch = shorter[token];
				shorterMatch = longer[token2];
			} else {
				longerMatch = longer[token2];
				shorterMatch = shorter[token];
			}

			if (shorterMatch == longerMatch) {
				count++;
				break;
			}
			// If it does not contain token, then see if instead it contains a sub-string match in each s2 word
			// This is for plurality, American English and British English spelling differences, etc
			else if (longerMatch.includes(shorterMatch) && shorterMatch.length > 1 && longerMatch.length > 1) {
				count+= 0.85;
				// For future word order comparison, lets just make the shorter word the same as the other word (Hacky?)
				shorter[token] = longer[token2];
				break;
			}
			// Then use use Levenshtein Distance to check if S2's tokens match with an edit distance of only ~3 characters, to allow it
			else if (dist < 3 && shorterMatch.length > 2 && longerMatch.length > 2) {
				count++;
				var weight = parseFloat("0." + dist*3);
				count = count - (weight);
				// For future word order comparison, lets just make the shorter word the same as the other word (Hacky?)
				shorter[token] = longer[token2];
				break;
			}
			// No matches? Remove it.
			else if (token2 == len2) {
				shorter.splice(token, 1);
				if (shorter.length == 0) {return 0} // Early out incase s1 is empty
				token--;
				len = shorter.length;
			}
		}
	}

	// Then check the word order
	// For example, "Will you do it" and "Do you will it" are two different sentences. This sentence would match 4/4 if we do not check word order.
	for (var token = 1, len = shorter.length; token < len; ++token) {
		var previousPos = longer.indexOf(shorter[token-1]);
		var currentPos = longer.indexOf(shorter[token]);

		// If the position of the previous Source Text word is after the current word, then it is out of order
		// This could be more complex, such as finding consistent relative order: How many steps infront or behind is the current word to the previous?
		// However for now, lets make it so that if it is not out of order to not change weighting. But, if it is out of order, then change weighting by 0.25.
		// To be more complex, we could + more weight based on amount of steps in distance.
		if (previousPos > currentPos && currentPos != -1 && previousPos != -1) {
			count = count - 0.2;
		}
	}

	// Return a weighted result
	return Math.floor(count / longer.length * 100);
}

function editDistance(s1, s2) {
	s1 = s1.toLowerCase();
	s2 = s2.toLowerCase();

	var costs = new Array();
	for (var i = 0, len1=s1.length; i <= len1; i++) {
		var lastValue = i;
		for (var j = 0, len2=s2.length; j <= len2; j++) {
			if (i == 0) {
				costs[j] = j;
			} else if (j > 0) {
				var newValue = costs[j - 1];
				if (s1.charAt(i - 1) != s2.charAt(j - 1))
					newValue = Math.min(Math.min(newValue, lastValue),
					costs[j]) + 1;
					costs[j - 1] = lastValue;
					lastValue = newValue;
			}
		}
		if (i > 0) {
			costs[s2.length] = lastValue;
		}
	}
	return costs[s2.length];
}