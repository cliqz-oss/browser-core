<!-- conversations.tpl -->

<div class="main">
    <div class='cqz-result-title overflow' arrow-override=''>
        <h1 class="main__headline">
            <div id="historysub">
                    <span class="{{#unless isFavorite}}active{{/unless}}" id="show_history" style="float: left" onclick="History.init(false)">{{local 'mobile_history_title'}}</span>
                    <span class="{{#if isFavorite}}active{{/if}}" id="show_favorites_only" style="float: right" onclick="History.init(true)">{{local 'mobile_favorites_title'}}</span>
            </div>
            <!-- <a extra="title">THE PAST</a> -->
        </h1>
    </div>
    <div class="main__content history">
        {{#each data}}

            {{#if url}}

            <table cellspacing="0" cellpadding="0" class="answer" data="{{url}}" data-title="{{title}}"
                   data-id="{{id}}" data-timestamp={{ timestamp }} data-index="{{@index}}">
                <tr>
	                <td class="edit__delete"><input name="delete" type="checkbox" disabled></td>
                    <td class="framer">
                        <p>{{title}}</p>
                        <p class="url">{{domain}}</p>
                    </td>
                    <td class="meta">
                        <div>{{conversationsTime timestamp}}</div>
                        {{#if favorite}}<div>favorite</div>{{/if}}
                    </td>
                </tr>
            </table>

            {{else}}

                {{#if query}}

                <table cellspacing="0" cellpadding="0" class="question" data="{{query}}"
                       data-id="{{id}}" data-timestamp={{ timestamp }} data-index="{{@index}}">
                    <tr>
                        <td class="meta">
                            <div>{{conversationsTime timestamp}}</div>
                        	{{#if favorite}}<div>favorite</div>{{/if}}
                        </td>
                        <td class="framer">
                            <p class="query">{{query}}</p>
                        </td>
                        <td class="edit__delete"><input name="delete" type="checkbox" disabled></td>
                    </tr>
                </table>

                {{else}}
                <h2><span>{{this.date}}</span></h2>

                {{/if}}

            {{/if}}
        {{/each}}
        <div id="control" style="display:none;background-color: #862701;position:fixed">
            {{#if isFavorite}}
                <table>
                    <td id='control_star' onclick="History.favoriteSelected()">
                        {{local 'mobile_history_unstar'}}
                    </td>
                    <td onclick="History.endEditMode()">
                        {{local 'mobile_history_cancel'}}
                    </td>
                </table>
            {{else}}
                <table>
                    <td onclick="History.removeSelected()">
                        {{local 'mobile_history_remove'}}
                    </td>
                    <td id='control_star' onclick="History.favoriteSelected()">
                        {{local 'mobile_history_star'}}
                    </td>
                    <td onclick="History.endEditMode()">
                        {{local 'mobile_history_cancel'}}
                    </td>
                </table>
            {{/if}}
        </div>
        {{#unless data}}
			<div class="nohistoryyet">
                {{#if isFavorite}}
                    <p>{{{local 'mobile_no_favorites'}}}</p>
                {{else}}
                    <p>{{{local 'mobile_no_history'}}}</p>
                {{/if}}
			</div>
		{{/unless}}

    </div>
</div>

<div style="clear:both;"></div>
<div id="search" style="display:none">
    <input id="search_input" type="text" placeholder="Filtern nach..." />
</div>

<!-- end conversations.tpl -->