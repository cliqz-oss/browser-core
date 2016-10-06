<!-- entity-news-1 -->

{{#with logo}}
	<div extra="logo" class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}

<section class="primary">

    <h1 class="card__title" url="{{url}}" extra="title">
       {{ emphasis data.name text 2 true }}
    </h1>

    <div extra="url" class="card__meta">
        <div>{{urlDetails.friendly_url}}</div>
    </div>

    <div class="primary card__description">
        <div class="main mulitple">
          {{#each data.news}}
            <div url="{{url}}" extra="entry-{{@index}}" class="item">
              <div class="main__image" data-style="background-image: url({{#if thumbnail}}{{ thumbnail }}{{else}}http://cdn.cliqz.com/extension/EZ/news/no-image-mobile.png{{/if}});">
                  Image
              </div>
              <h1 class="main__headline">
                {{ title }}
                <span>
                  {{#if tweet_count}}
                    <span class="tweet_count">
                      <img data-src="http://cdn.cliqz.com/extension/EZ/cliqz/EZ-social-twitter.svg"> {{tweet_count}}
                    </span>
                  {{/if}}
                  {{time}}
                </span>  
              </h1>
            </div>
          {{/each}}
        </div>
    </div>
    {{>EZ-category}}
</section>


