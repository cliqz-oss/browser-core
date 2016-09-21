<!-- conversations.tpl -->

<ul id="container" class="content history">
    {{#each data}}

        {{#if url}}

            <li class="cf answer" data-ref="{{url}}" data-title="{{title}}"
                 data-id="{{id}}" data-timestamp={{ timestamp }} data-index="{{@index}}">

                <div class="item">
                    {{#with logo}}
                        {{#if backgroundImage}}
                            <div class="item__logo bg" style="background-image:{{backgroundImage}};
                                                              background-color:#{{backgroundColor}}"></div>
                        {{else}}
                            <div class="item__logo" style="{{ style }}">
                                {{ text }}
                            </div>
                        {{/if}}
                    {{/with}}
                    <div class="url"><div>{{domain}}</div></div>
                    <div class="item__head">
                        {{title}}
                    </div>
                    <div class="item__meta">
                        {{conversationsTime timestamp}}
                    </div>
                </div>
            </li>

        {{else}}

            {{#if query}}

                <li class="cf question" data-ref="{{query}}"
                       data-id="{{id}}" data-timestamp={{ timestamp }} data-index="{{@index}}">
                    <div class="item">
                        <div class="item__meta">
                            <div>{{conversationsTime timestamp}}</div>
                        </div>
                        <div class="item__head">
                            {{query}}
                        </div>
                    </div>
                </li>

                {{else}}
                    
                    <li>
                        <div class="dateline"><span>{{this.date}}</span></div>
                    </li>

            {{/if}}

        {{/if}}
    {{/each}}
</ul>
    
{{#unless data}}
	<div class="nohistoryyet">
        <p>{{{local 'mobile_no_history'}}}</p>
	</div>
{{/unless}}



<div style="clear:both;"></div>
<div id="search" style="display:none">
    <input id="search_input" type="text" placeholder="Filtern nach..." />
</div>

<!-- end conversations.tpl -->