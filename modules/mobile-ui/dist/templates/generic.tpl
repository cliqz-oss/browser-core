<!-- generic.tpl -->

{{#with logo}}
    <div extra="logo" class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
{{/with}}

<div extra="url" class="card__meta">
    <div>{{urlDetails.friendly_url}}</div>
</div>

<section class="primary">

    <h1 extra="title" class="card__title">
        {{#if data.richData.full_name}}
            {{data.richData.full_name}}
        {{else}}
            {{#if data.title}}
                {{data.title}}
            {{else}}
                {{title}}
            {{/if}}
        {{/if}}
        {{#if data.richData.under_name}}<span>{{data.richData.under_name}}</span>{{/if}}
    </h1>


    {{#if data.richData.discovery_timestamp}}
        <div class="timestamp">{{ agoline data.richData.discovery_timestamp }}</div>
    {{else}}
    	<div class="separator"></div>
    {{/if}}

    <!-- main images -->

    <div class="card__gallery">
		
		{{#each data.richData.images}}
			{{#if (limit @index 3)}}
				<div class="image" data-style="background-image: url({{this}})">Image</div>
			{{/if}}
		{{/each}}

		{{#if data.richData.image}}
            <div class="image big" data-style="background-image: url({{ data.richData.image }});">
                Image
            </div>
        {{else}}

			{{#if data.media}}
				<div class="image big" data-style="background-image: url({{ data.media }});">
					Image
				</div>
			{{else}}
				{{#if data.image.src}}
					<div class="image big" data-style="background-image: url({{ data.image.src }})">
						Image
					</div>
				{{/if}}
				{{#if data.i}}
					<div class="image big" data-style="background-image: url({{ data.i }})">
						Image
					</div>
				{{/if}}
			{{/if}}

		{{/if}}
	</div>

    <!-- end main images -->

	<!-- for videos -->
	{{#if data.items}}
		<div class="ez-video">
			{{#each data.items}}

				<div class="item" url="{{link}}">
				  <div class="main__image" data-style="background-image: url({{ thumbnail }})">
					  {{#if (sec_to_duration duration)}}<span> {{ sec_to_duration duration}}</span>{{/if}}
				  </div>
				  <h1 class="main__headline">{{ title }}</h1>
				  <!--<div class="main__meta">{{ views_helper views}}</div>-->
				</div>

			{{/each}}
		</div>
	{{/if}}
	<!--end for videos -->

	<div extra="des" class="card__description">

		<div class="main__rating">
			{{#if data.richData.url_ratingimg}}
				<img data-src="{{data.richData.url_ratingimg}}" class="cqz-rd-rateimg"/>
			{{/if}}

			{{#if data.richData.rating.img}}
				{{#if data.richData.rating.val}}
					<img data-src="{{data.richData.rating.img}}" class="cqz-rd-rateimg"/>
				{{/if}}
			{{/if}}

			{{#if data.r.img}}
				{{#if data.r.val}}
					<img data-src="{{data.r.img}}" class="cqz-rd-rateimg"/>
					{{numberFormat data.r.val}}/{{data.r.scale}} <!--({{data.r.nVote}} Stimmen)-->
				{{/if}}
			{{/if}}
		</div>

		{{#with data.richData.director}}
			<div url="{{info.url}}" class="main__director">
				{{title}}: {{info.name}}
			</div>
		{{/with}}

		{{#if data.des}}
			{{ emphasis data.des query 2 true }}
		{{else}}
			{{#if data.richData.current_company}}
			{{else}}
				{{ emphasis data.description query 2 true }}
			{{/if}}
		{{/if}}

		<!-- people data -->
			{{#with data.richData}}
				{{#if current_job_title}}<br />{{current_job_title}}{{/if}}
				{{#if current_company}}<br />{{current_company}}{{/if}}
				{{#if since}}<br />seit {{since}}{{/if}}
			{{/with}}
		<!-- end people data -->
	</div>

</section>

<section class="secondary">

	{{#if data.richData.mobi.ingredients}}
		<div class="card__description">
			<ul class="recipe_ingredients">
				{{#each data.richData.mobi.ingredients}}
					<li>{{this}}</li>
				{{/each}}
			</ul>
		</div>
	{{/if}}

	{{#if data.news}}
		{{#each data.news}}
			<div class="cards__item news">

				{{#with logoDetails}}
					<div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}"
						 style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}
					</div>
				{{/with}}

				<h2 class="cards__title__secondary" url="{{url}}">{{title}}</h2>
				<div class="card__meta__secondary">
					{{url}}
				</div>
			</div>
		{{/each}}
	{{/if}}

	{{#each data.actionsExternalMixed}}
		<div class="cards__item actionsExternalMixed">
			{{#with logoDetails}}
				<div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
			{{/with}}
			<h2 class="cards__title__secondary" url="{{url}}">
				{{title}}
				<span>{{trimNumbers rank}}</span>
			</h2>
		</div>
	{{/each}}

	{{#each data.links}}
        <div url="{{url}}" extra="link-{{@index}}" class="cards__item links">
            <div class="card__logo__secondary bg"
            	data-style="background-image:url({{icon}});background-color:#{{../logo.backgroundColor}}">{{ text }}</div>
            <h2 class="cards__title__secondary">
                {{title}}
            </h2>
        </div>
    {{/each}}

    {{#each data.actions}}
    	{{#if (limit @index 10)}}
            <div url="{{url}}" extra="action-{{@index}}" class="cards__item links">
                <h2 class="cards__title__secondary">
                    {{title}}
                </h2>
            </div>
        {{/if}}
    {{/each}}


	{{#if data.richData.internal_links}}
        {{#each data.richData.internal_links}}
            <div url="{{mobileWikipediaUrls url}}" class="cards__item internal_links">
                <h2 class="cards__title__secondary">
                    {{title}}
                </h2>
            </div>

        {{/each}}
    {{/if}}

    {{#each data.richData.additional_sources}}

        <div class="additional_sources" url="{{url}}">
            {{#with ../logo}}
                {{#if backgroundImage}}
                    <div class="item__logo bg" style="background-image:{{backgroundImage}};
                                                      background-color:#{{backgroundColor}}">
                    </div>
                {{else}}
                    <div class="item__logo" style="{{ style }}">
                        {{ text }}
                    </div>
                {{/if}}
            {{/with}}
            <div class="url"><div>{{url}}</div></div>
            <h2 class="cards__title__secondary" data-index="{{@index}}">
                {{title}}
            </h2>
        </div>
    {{/each}}


    {{#each data.external_social}}
        <div class="cards__item external_social">
            <div class="card__logo__secondary bg" data-style="background-image: url({{img}});background-color:#fff;">{{ domain }}</div>
            <h2 class="cards__title__secondary" url="{{u}}">{{domain}}</h2>
        </div>
     {{/each}}

    {{#each data.w}}
        <div class="cards__item data_w">
            <div class="card__logo__secondary" data-style="background-image: url({{logo}});background-color:#fff;">.</div>
            <h2 class="cards__title__secondary" url="{{u}}">{{source}}</h2>
        </div>
     {{/each}}

</section>

{{>EZ-category}}

{{partial 'history'}}

<!-- end generic.tpl -->
