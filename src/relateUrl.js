"use strict";
const evaluateValue = require("evaluate-value");
const isURL = require("isurl");
const minUrl = require("minurl");
const URL = require("isomorphic-url").URL;
const urlRelation = require("url-relation");



const output = 
{
	PROTOCOL_RELATIVE:  0,
	ROOT_PATH_RELATIVE: 1,
	PATH_RELATIVE:      2,  // undocumented
	SHORTEST:           3
};

const defaultOptions = Object.assign
(
	{
		deepQuery: urlRelation.DEFAULT_OPTIONS.deepQuery,
		output: output.SHORTEST
	}, 
	minUrl.DEFAULT_OPTIONS,
	{
		removeEmptyHash: function(url, relationToBase)
		{
			return relationToBase < urlRelation.PATH;
		}
	}
);



const dirPattern = /\/|[^\/]+/g;



function parseOptions(defaultOptions, customOptions)
{
	if (customOptions == null) return defaultOptions;
	
	return Object.assign({}, defaultOptions, customOptions);
}



function relateDirs(baseDirs, urlDirs)
{
	const numFromDirs = baseDirs.length;
	const numToDirs = urlDirs.length;
	const relatedDirs = [];
	let parentIndex = -1;
	let related = true;
	let slashes = 0;
	let i;

	// Find parents
	for (i=0; i<numFromDirs; i++)
	{
		// Keep track of groups of repeating slashes
		if (baseDirs[i] === "/")
		{
			slashes++;
		}
		else
		{
			slashes = 0;
		}

		if (related === true)
		{
			if (urlDirs[i] !== baseDirs[i])
			{
				related = false;
			}
			else
			{
				// The last related index
				parentIndex = i;
			}
		}

		if (related === false)
		{
			if (slashes===0 || slashes>1)
			{
				// Up one level
				relatedDirs.push("..", "/");
			}
		}
	}

	// Add children -- starting after last related dir
	for (i=parentIndex+1; i<numToDirs; i++)
	{
		if (i===parentIndex+1 && urlDirs[i]==="/" && relatedDirs.length===0)
		{
			relatedDirs.push(".", "/");
		}

		relatedDirs.push( urlDirs[i] );
	}

	return relatedDirs;
}



function relateToRootPath(url, options, minifyOptions)
{
	url = minUrl(url, minifyOptions);

	const pattern = new RegExp(`^${url.protocol}\/?\/?${url.username}:?${url.password}@?${url.hostname}:?${url.port}`);

	url = minUrl(url, 
	{
		plusQueries: false,
		removeDefaultPort: false,
		removeDirectoryIndex: false,
		removeEmptyHash: false,
		removeEmptyQueries: false,
		removeEmptyQueryValues: false,
		removeEmptyQueryVars: false,
		removeRootTrailingSlash: options.removeRootTrailingSlash,
		removeTrailingSlash: options.removeTrailingSlash,
		removeWWW: false
	});

	// Remove everything before the path
	let output = url.replace(pattern, "");

	if (output === "")
	{
		output = "/";
	}

	return output;
}



function relateUrl(url, base, options)
{
	if (isURL(base) === false)
	{
		base = new URL(base);
	}

	if (isURL(url) === false)
	{
		url = new URL(url, base);
	}

	// TODO :: only remove empty hashes if same server as base, to preserve empty anchors
	// TODO :: this can slow things down when running multiple times
	options = parseOptions(defaultOptions, options);
	
	// TODO :: just pass `options` ?
	const relation = urlRelation(base, url,
	{
		deepQuery: options.deepQuery,
		defaultPorts: options.defaultPorts,
		directoryIndexes: options.directoryIndexes,
		ignoreDefaultPort: options.removeDefaultPort,
		ignoreDirectoryIndex: options.removeDirectoryIndex,
		//ignoreEmptyQueries: options.removeEmptyQueries,
		ignoreWWW: options.removeWWW
	});

	// Custom callback arguments, by preventing `minUrl()` from running the function
	options.removeEmptyHash = evaluateValue(options.removeEmptyHash, url, relation);

	if (relation === urlRelation.NONE)
	{
		return minUrl(url, options);
	}

	if (relation<urlRelation.AUTH || options.output===output.PROTOCOL_RELATIVE)
	{
		// Remove protocol
		return minUrl(url, options).slice(url.protocol.length);
	}

	const specialMinifyOptions = Object.assign({}, options, { noStringify:true });

	if (options.output === output.ROOT_PATH_RELATIVE)
	{
		return relateToRootPath(url, options, specialMinifyOptions);
	}

	url = minUrl(url, specialMinifyOptions);

	// https://github.com/whatwg/url/issues/221
	const urlHash = url.href.indexOf("#")===url.href.length-1 ? "#" : url.hash;
	
	if (relation >= urlRelation.SEARCH)
	{
		return urlHash;
	}

	if (relation >= urlRelation.FILENAME)
	{
		if (options.deepQuery !==true)
		{
			base = minUrl(base, specialMinifyOptions);

			// Avoid similar queries minifying to the same, but not truncating because 
			// they were seen as unrelated due to a shallow scan
			if (url.search === base.search)
			{
				return urlHash;
			}
		}

		if (url.search === "")
		{
			return "." + urlHash;
		}

		return url.search + urlHash;
	}
	
	const baseDirs = splitPathname(base.pathname);
	const urlDirs = splitPathname(url.pathname);
	let baseFilename = baseDirs[baseDirs.length - 1];
	let urlFilename = urlDirs[urlDirs.length - 1];

	if (urlFilename===undefined || urlFilename==="/")
	{
		urlFilename = "";
	}
	else
	{
		// Remove filename
		urlDirs.pop();
	}

	if (baseFilename===undefined || baseFilename==="/")
	{
		baseFilename = "";
	}
	else
	{
		// Remove filename
		baseDirs.pop();
	}
	
	if (relation >= urlRelation.DIRECTORY)
	{
		if (urlFilename==="" && baseFilename!=="")
		{
			urlFilename = ".";
		}

		return urlFilename + url.search + urlHash;
	}
	
	const relatedDirs = relateDirs(baseDirs, urlDirs);


	if (urlFilename === "")
	{
		if (relatedDirs[relatedDirs.length-2] === "..")
		{
			//if (urlFilename !== "")
			//{
				relatedDirs.pop();
			//}
		}
		else if (evaluateValue(options.removeTrailingSlash, url) === true)
		{
			if (relatedDirs[relatedDirs.length-1] === "/")
			{
				// If doesn't end with "//"
				if (relatedDirs[relatedDirs.length-2] !== "/")
				{
					// TODO :: needs test(s)
					relatedDirs.pop();
				}
			}
		}
		else if (evaluateValue(options.removeRootTrailingSlash, base, url) === true)
		{
			if (relatedDirs.length === 1)
			{
				// TODO :: needs test with "//" root slash
				relatedDirs.pop();
			}
		}
	}

	let pathRelative = relatedDirs.join("");

	if (pathRelative==="" && urlFilename==="")
	{
		urlFilename = ".";
	}

	pathRelative += urlFilename + url.search + urlHash;

	if (options.output === output.PATH_RELATIVE)
	{
		return pathRelative;
	}

	const rootPathRelative = relateToRootPath(url, options, specialMinifyOptions);

	// Return shortest -- if same, root-path-relative takes priority as it's more direct
	return rootPathRelative.length <= pathRelative.length ? rootPathRelative : pathRelative;
}



function splitPathname(pathname)
{
	// Remove leading slash, which will always exist
	pathname = pathname.substr(1);

	// Split by and include slashes
	// Simply splitting produced issues with trailing "//" and joining
	let output = pathname.match(dirPattern);

	if (output === null)
	{
		output = [];
	}

	return output;
}



relateUrl.DEFAULT_OPTIONS = defaultOptions;

Object.assign(relateUrl, output);



module.exports = Object.freeze(relateUrl);
