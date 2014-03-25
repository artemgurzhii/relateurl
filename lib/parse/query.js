function parseQuery(urlObj, options)
{
	urlObj.query.string.full = stringify(urlObj.query.object, false);
	
	//if (options.removeEmptyQueries)
	//{
		urlObj.query.string.stripped = stringify(urlObj.query.object, true);
	//}
	
	return urlObj;
}



function stringify(queryObj, removeEmptyQueries)
{
	var count = 0;
	var str = "";
	
	for (var i in queryObj)
	{
		if (i != "")
		{
			var value = queryObj[i];
			
			if (value != "" || !removeEmptyQueries)
			{
				str += (++count==1) ? "?" : "&";
				
				i = encodeURIComponent(i);
				
				if (value != "")
				{
					str += i +"="+ encodeURIComponent(value).replace(/%20/g,"+");
				}
				else
				{
					str += i;
				}
			}
		}
	}
	
	return str;
}



module.exports = parseQuery;