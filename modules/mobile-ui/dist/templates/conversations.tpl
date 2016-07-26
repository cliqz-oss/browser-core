<!-- conversations.tpl -->

<div class="main">
    <div class='cqz-result-title overflow' arrow-override=''>
        <h1 class="main__headline">
       		<div id="historysub">
       				<span id="show_favorites_only" style="float: left" onclick="History.getHistory(true)">Favoriten</span>
       				<span class="active" id="show_history" style="float: right" onclick="History.getHistory(false)">Besuchte Seiten</span>
			</div>
            <!-- <a extra="title">THE PAST</a> -->
        </h1>
    </div>
    <div class="main__content history">
        {{#each data}}

            {{#if url}}

            <table cellspacing="0" cellpadding="0" class="answer" data="{{url}}"
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
        </div>
        {{#unless data}}
			<div class="nohistoryyet">
                <p>{{{emptyMsg}}}</p>
			</div>
		{{/unless}}

    </div>
</div>

<div style="clear:both;"></div>
<div id="search" style="display:none">
    <input id="search_input" type="text" placeholder="Filtern nach..." />
</div>

<!-- end conversations.tpl -->
