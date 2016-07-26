<!-- history.tpl -->

{{#if data.urls}}
    <section class="primary">
        <h1 class="card__title">History results</h1>
    </section>

    <section class="secondary">
        {{#each data.urls}}
                <div class="cards__item news" url='{{href}}' shortUrl='{{link}}' domain='{{domain}}' extra='{{extra}}' arrow="false">
                    {{#with logo}}
                        <div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" data-style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
                    {{/with}}

                    <h2 class="cards__title__secondary" url="{{url}}">{{ emphasis title ../text 2 true }}</h2>
                    <div class="card__meta__secondary">
                        {{ emphasis link ../text 2 true }}
                    </div>
                </div>
        {{/each}}
    </section>
{{/if}}

<!-- end history.tpl -->
