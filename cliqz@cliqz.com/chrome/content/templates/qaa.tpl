<div class='cliqz-inline-box-children cliqz-result-generic'>
	<div class='cliqz-result-left-box'>
		<div class='cliqz-result-type' ></div>
	</div>
	<div class='cliqz-result-mid-box' style="width:{{ width }}px">
		<div class='cliqz-result-title-box overflow' extra="title">
			{{ title }}
		</div>
		{{> url this}}
		{{#with data.richData}}
		<div class='overflow' style="font-size: 10pt; color:#aaa; padding-top:4px">
			<span class='cliqz-qaa-answer'></span>
			<span class='cliqz-qaa-answer-value'>ANTWORTEN: {{answers}}</span>
			|
			{{#if accepted}}
				<span class='cliqz-qaa-accepted'>Hilfreichste Antwort</span>
				|
			{{else}}
				<!--<span class='cliqz-qaa-declined'>Scheisse Antwort</span>-->
			{{/if}}
			<span class='cliqz-qaa-posted'>geposted am</span>
			<span class='cliqz-qaa-posted-value'>{{posted_at}}</span>
		</div>
		{{/with}}
	</div>
	<div class='cliqz-result-right-box cliqz-logo {{ logo }}'
	     newtab='true'>
	</div>
</div>
{{#if data.richData.additional_sources}}
	<div class='cliqz-qaa-sources'>
	{{#each data.richData.additional_sources}}
		<div url='{{url}}'
			 idx='{{ @index }}'
			 type='{{ ../type }}'
		     class='cliqz-qaa-source-title-with-logo {{generate_logo url}}'>
			{{title}}
		</div>
	{{/each}}
	</div>
{{/if}}
