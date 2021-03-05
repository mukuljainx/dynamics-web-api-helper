## Microsoft Dynamics Web API helpers

Collection of simple helpers, to makes use of `webApi` more simpler.

- stringify
- batch request

### stringify

`stringify` converts more readable & maintainable request object to url.

```
webAPIHelper({
	filter: ['_value', 'eq', id],
	   orderBy: 'priority',
	   select: [
	     '_createdby_value',
	     'createdon',
	     'some_value',
	     'modifiedon',
	   ],
	   expand: [
	     {
	       name: 'some_related_table',
	       select: [
	         'answer',
	         'name',
	       ],
	     },
	     {
	       name: 'other_related_table',
	       select: ['summarytype'],
	     },
	   ],
	 });
```

to `"?$select=_createdby_value,createdon,some_value,modifiedon&$filter= _value eq id &$orderby=priority asc&$expand=some_related_table($select=answer,name),other_related_table($select=summarytype)"`

### batch request

A promisified class written over [`$batch` api](https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/execute-batch-operations-using-web-api) with transaction support. It also parses (unstable) the result to objects for easier user. Just the actual `$batch` call this also support maximum of 1000 requests at a time. Please use `Promise.all` with multiple batch instance for more queries.

It is also wort noting that `$batch` supports `XMLHttp` tables name not the `webApi` one.
