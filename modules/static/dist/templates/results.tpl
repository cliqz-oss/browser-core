{{#each results}}
	{{#unless invalid}}
		<div class='cqz-result-box'
			type='{{ type }}'
			kind='{{ kind_printer data.kind }}'
			{{#if url}}
				url='{{ url }}'
				{{#unless (logic type 'starts_with' 'cliqz-pattern')}}
					{{#unless (logic type 'starts_with' 'cliqz-custom')}}
						arrow="false"
					{{/unless}}
				{{/unless}}
			{{/if}}
			idx='{{ @index }}'
			hasimage='{{ hasimage image }}'
			>
			{{partial vertical}}
		</div>
	{{/unless}}
{{/each}}

<div class='cqz-result-selected transition'></div>
