<!-- URL.tpl -->
<div class='cliqz-result-url-box overflow'>
	<span class='cliqz-result-url-host
		{{#if urlDetails.ssl }}
		  cliqz-result-url-ssl
		{{/if}}
		'
	>
		{{ emphasis urlDetails.host query 2 false ~}}
	</span><span class='cliqz-result-url-path'>
		{{~ emphasis urlDetails.extra query 2 false }}
	</span>
</div>