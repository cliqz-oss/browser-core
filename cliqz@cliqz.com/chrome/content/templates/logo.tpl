{{#with logo}}
	<div
		newtab='true'
        extra="logo"
		class='cliqz-brand-logo
		       cqz-result-logo
		       cqz-vert-center
		       transition'
	    {{#if add_logo_url}}
			url="{{logo_url}}"
		{{/if}}
		style="{{ style }};"
	>
		{{ text }}
    </div>
{{/with}}
