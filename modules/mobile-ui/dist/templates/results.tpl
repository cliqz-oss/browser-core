<!-- results.tpl -->
{{sendTelemetry results.length}}
{{#each results}}
	{{#unless invalid}}
		<div class="frame" {{#if ../frameWidth }} style="width: {{ ../frameWidth }}px; left: {{ left }}px" {{/if}}>
			<div class="card">
				<div class="cqz-result-box"
					type='{{ type }}'
					kind='{{ kind_printer data.kind }}'
					{{#if url}}
						url='{{ url }}'
						{{#unless (logic type 'starts_with' 'cliqz-pattern')}}
							arrow="false"
						{{/unless}}
					{{/if}}
					idx='{{ @index }}'
					id='cqz-result-box-{{ @index }}'
					hasimage='{{ hasimage image }}'
					>
						{{partial vertical}}
					{{#if url}}
						<section class="share">
							<p cliqz-action='stop-click-event-propagation'
								onclick="osAPI.shareCard('{{ url }}')"
								>{{local 'mobile_share_card'}}: {{url}}</p>
						</section>
					{{/if}}
				</div>
			</div>
			<br>
		</div>
	{{/unless}}
{{/each}}

{{#if googleThis }}
	{{#ifShowSearch results}}
		{{#with googleThis }}
			<!-- googlethis -->
			<div class="frame" extra="search" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
				<div class="card last-card">
					<div id="defaultEngine" url="{{searchEngineUrl}}{{searchString}}" kind="CL" class="cqz-result-box"  style="background-color: #{{ background }}">
						<div id="googleThisAnim">
							<!-- <img data-src="skin/img/icon-google.svg"><br> -->
							<h3>{{ title }}</h3>
							
						</div>

					{{#with logo}}
						<div id="searchEngineLogo"
						 class="search_engine_logo"
						 style="{{style}}"
						 >
						</div>
					  {{/with}}
					  </div>
				</div>
			</div>
			<!-- end googlethis -->
		{{/with}}
	{{/ifShowSearch}}
{{/if}}

<div class='cqz-result-selected transition'></div>

<!-- end results.tpl -->
