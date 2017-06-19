{{#each results}}
	{{#unless invalid}}
		<div class='cqz-result-box cqz-result-box-simple'
			type='{{ type }}'
			kind='{{ kind_printer data.kind }}'
			{{#if url}}
				url='{{ url }}'
				arrow="false"
			{{/if}}
			idx='{{ @index }}'
			hasimage='{{ hasimage image }}'
			local-source='{{data.localSource}}'
			>
			{{partial 'simple-ui/result'}}
		</div>
	{{/unless}}
{{/each}}

<div class='cqz-result-selected transition'></div>
