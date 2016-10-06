<!-- celebrities.tpl @TODO -->

{{#with logo}}
	<div extra="logo" class="card__logo {{#if backgroundImage}}bg{{/if}}" data-style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
{{/with}}

{{#with data}}
<section class="primary">
		<h1 extra="title" class="card__title">{{ emphasis name ../text 2 true }} ({{ocupation}})</a><span>Wikipedia</span></h1>
		<div extra="url" class="card__meta">
			<div>{{../urlDetails.friendly_url}}</div>
		</div>
		<div class="card__gallery">			
			{{#each images}}
				{{#if (limit @index 3)}}
					<div extra="image-{{@index}}" class="image" data-style="background-image: url({{this}})">Image</div>
				{{/if}}
			{{/each}}
		</div>
		<div extra="des" class="card__description">
			{{ emphasis description_wiki ../query 2 true }}
		</div>

		<div class="social">
			{{#each social}}
				<div extra="social-{{@index}}" url="{{url}}" class="social__logo">
					<div class="card__logo__secondary bg" data-style="background-image: url({{img}});background-color:#fff;">{{ text }}</div>
				</div>
			{{/each}}
		</div>
	</section>

	<section class="secondary">
		
		{{#if data.news}}
			<!-- data.news -->
			{{#each data.news}}
				<div class="cards__item news">
					{{#with logoDetails}}
					<div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" data-style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
				{{/with}}		

					<h2 class="cards__title__secondary" url="{{url}}"><div>{{title}}</div></h2>
					<div class="card__meta__secondary">
						{{data.url}}
					</div>
				</div>
			{{/each}}
			<!-- end data.news -->
		{{/if}}

		{{#each data.actionsExternalMixed}}
			<div class="cards__item actionsExternalMixed">
				{{#with logoDetails}}
					<div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" data-style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
				{{/with}}	
				<h2 class="cards__title__secondary" url="{{url}}">
					{{title}}
					<span>{{trimNumbers rank}}</span>
				</h2>
			</div>
		{{/each}}	

		{{#each data.richData.internal_links}}
			<div url="{{url}}" extra="link-{{@index}}" class="cards__item internal_links">

				<h2 class="cards__title__secondary">
					{{title}}
				</h2>
			</div>
		{{/each}}

		{{#each data.richData.additional_sources}} 
			<div class="additional_sources">
				<h2 class="cards__title__secondary" url="{{url}}">{{title}}</h2>
			</div>
		{{/each}}    

	</section>

	{{>EZ-category}}

{{/with}}

<!-- end celebrities.tpl @TODO -->