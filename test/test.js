"use strict";
const expect = require("chai").expect;
const isomorphicURL = require("isomorphic-url");
const relateUrl = require("../lib/relateUrl");
const tests = require("./helpers/tests.json");

const it_searchParamsOnly = isomorphicURL.supportsSearchParams===true ? it : it.skip;
const URL = isomorphicURL.URL;



function combinations(options)
{
	const depth = options.deepQuery===true ? "deep" : "shallow";
	const it = options.deepQuery===true ? "it_searchParamsOnly" : "it";
	const optionsString = JSON.stringify(options);
	const outputName = outputKey(options.output);
	let skipped = 0;
	let code = "";
	code += `${it}("supports ${tests.length} different url combinations", function()\n`;
	code += `{\n`
	code += `	this.timeout(6000);\n`;
	for (let i=0; i<tests.length; i++)
	{
	if (tests[i].related[depth][outputName] === null) { skipped++; continue }
	//code += `	console.log("=======");\n`;
	//code += `	console.log("${tests[i].url}");\n`;
	//code += `	console.log("${tests[i].base}");\n`;
	//code += `	console.log(${i}, "${tests[i].related[depth][outputName]}");\n`;
	code += `	expect( relateUrl("${tests[i].url}","${tests[i].base}",${optionsString}) ).to.equal("${tests[i].related[depth][outputName]}");\n`;

	// TODO :: parse relative url with base and expect relation to be ALL
	}
	if (skipped > 0) code += `console.log("${skipped} skipped");\n`;
	code += `});\n`;

	return code;
}



// TODO :: use `...overides` when dropping Node v4 support
function options(overrides)
{
	const resetOptions = 
	{
		deepQuery: false,
		output: relateUrl.SHORTEST,

		// minurl options
		defaultPorts: {},
		directoryIndexes: {},
		plusQueries: false,
		removeDefaultPort: false,
		removeDirectoryIndex: false,
		removeEmptyHash: false,
		removeEmptyQueries: false,
		removeEmptyQueryValues: false,
		removeEmptyQueryVars: false,
		removeRootTrailingSlash: false,
		removeTrailingSlash: false,
		removeWWW: false
	};

	if (overrides == null) return resetOptions;

	return Object.assign.apply(undefined, [resetOptions].concat(overrides));
}



function outputKey(value)
{
	for (let key in relateUrl)
	{
		if (relateUrl[key] === value) return key;
	}
}



describe("relateUrl", function()
{
	it("has default options available", function()
	{
		expect( relateUrl.DEFAULT_OPTIONS ).to.be.an("object");

		const originalValue = relateUrl.DEFAULT_OPTIONS;

		expect(() => relateUrl.DEFAULT_OPTIONS = "changed").to.throw();
		//expect(() => relateUrl.DEFAULT_OPTIONS.defaultPorts = "changed").to.throw();
		expect(relateUrl.DEFAULT_OPTIONS).to.equal(originalValue);
	});



	it("has output levels available", function()
	{
		expect(relateUrl).to.contain.all.keys(["PROTOCOL_RELATIVE", "SHORTEST"]);

		const originalValue = relateUrl.SHORTEST;

		expect(() => relateUrl.SHORTEST = "changed").to.throw();
		expect(relateUrl.SHORTEST).to.equal(originalValue);
	});



	it("accepts String input", function()
	{
		const opts = options();
		const url  = "http://domain.com/dir1/dir2/index.html";
		const base = "http://domain.com/dir1/dir3/index.html";
		expect( relateUrl(url,base,opts) ).to.equal("../dir2/index.html");
	});
	
	
	
	it("accepts URL input", function()
	{
		const opts = options();
		const url  = new URL("http://domain.com/dir1/dir2/index.html");
		const base = new URL("http://domain.com/dir1/dir3/index.html");
		expect( relateUrl(url,base,opts) ).to.equal("../dir2/index.html");
	});



	it("accepts mixed input", function()
	{
		const opts = options();
		const url1 = new URL("http://domain.com/dir1/dir2/index.html");
		const url2 =         "http://domain.com/dir1/dir3/index.html";
		expect( relateUrl(url1,url2,opts) ).to.equal("../dir2/index.html");
		expect( relateUrl(url2,url1,opts) ).to.equal("../dir3/index.html");
	});
	
	
	
	// TODO :: rejects unsupported input, invalid URLs and null
	
	
	
	describe("options", function()
	{
		describe("defaults; output = PROTOCOL_RELATIVE", function()
		{
			eval( combinations( options(relateUrl.DEFAULT_OPTIONS, { output:relateUrl.PROTOCOL_RELATIVE }) ) );
		});



		describe("defaults; output = ROOT_PATH_RELATIVE", function()
		{
			eval( combinations( options(relateUrl.DEFAULT_OPTIONS, { output:relateUrl.ROOT_PATH_RELATIVE }) ) );
		});



		describe("defaults; output = PATH_RELATIVE", function()
		{
			eval( combinations( options(relateUrl.DEFAULT_OPTIONS, { output:relateUrl.PATH_RELATIVE }) ) );
		});



		describe("defaults; output = SHORTEST", function()
		{
			eval( combinations(relateUrl.DEFAULT_OPTIONS) );
		});



		describe("defaults; output = PROTOCOL_RELATIVE, deepQuery = false", function()
		{
			eval( combinations( options(relateUrl.DEFAULT_OPTIONS, { output:relateUrl.PROTOCOL_RELATIVE, deepQuery:false }) ) );
		});



		describe("defaults; output = PATH_RELATIVE, deepQuery = false", function()
		{
			eval( combinations( options(relateUrl.DEFAULT_OPTIONS, { output:relateUrl.PATH_RELATIVE, deepQuery:false }) ) );
		});



		describe("defaults; output = ROOT_PATH_RELATIVE, deepQuery = false", function()
		{
			eval( combinations( options(relateUrl.DEFAULT_OPTIONS, { output:relateUrl.ROOT_PATH_RELATIVE, deepQuery:false }) ) );
		});



		describe("defaults; output = SHORTEST, deepQuery = false", function()
		{
			eval( combinations( options(relateUrl.DEFAULT_OPTIONS, { deepQuery:false }) ) );
		});
	});
});
