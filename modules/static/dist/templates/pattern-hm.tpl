<!-- EZ-history.tpl -->
{{#with data}}
	<div class="cliqz-history-results cqz-3-history-results cqz-result-padding cqz-history-with-cluster" style="background: rgba(234,234,80,1.0);">
        {{#each urls}}
            <div class="cqz-history-result-item">
                <div class="cqz-row cqz-collapse-outer-space"
                         url="{{href}}"
                         shortUrl="{{link}}"
                         extra="{{extra}}"
                         domain="{{domain}}"
                         arrow="false"
                         kind="{{ kind_printer kind }}">

                        <div class="cqz-col-8">
                            <span class="cqz-title cqz-ellipsis" style="color: #937; font-size: 16px;">
                                {{ emphasis title ../../text 2 true }}
                            </span>
                        </div>
                        <div class="cqz-col-4" >
                            <span class="cqz-url cqz-ellipsis" style="font-size: 14px; color: rgba(84,84,84,1.0);">
                                {{ emphasis link ../../text 2 true }}
                            </span>
                        </div>
                </div>

               <div class="cqz-row cqz-collapse-outer-space">
                    <!-- <div class="cqz-col-1"></div> -->
                    <div class="{{class-col-cluster}}">
                        <ul class="cqz-history-cluster" style="font-weight: bold; font-size: 14px;">
                            {{#if xtra_c }}
                            <li><span style="padding-left: 10px;"></span></li>
                            {{/if}}
                            {{#each xtra_c }}
                                <li>
                                    <a style="color: grey;" href="{{ this.[0] }}">[<span>{{ this.[2] }}</span>]</a>
                                </li>
                            {{/each}}
                        </ul>
                    </div>
                    {{#if xtra_q }}
                    <div class="{{class-col-query}}">
                        <ul class="cqz-history-cluster">
                            <span></span>
                            {{#each xtra_q }}
                                <li class="cqz-history-query">
                                    <span>"{{ this }}"</span>
                                </li>
                            {{/each}}
                        </ul>
                    </div>
                    {{/if}}
                </div>

                {{#with logo}}
                     <div
                         newtab="true"
                         class="cliqz-brand-logo
                           cliqz-history-logo
                           transition"
                         {{#if add_logo_url}}
                             url="{{logo_url}}"
                         {{/if}}
                         style="{{ style }};"
                             >
                         {{ text }}
                     </div>
                {{/with}}
            </div>
        {{/each}}
        {{#if cont}}
	     <div class="cqz-history-result-item">
	            <ul class="cqz-history-cluster" style="font-weight: bold; font-size: 14px;">
	                <li><span>Cues to your history:</span></li>
	            {{#each cont}}
	                <li>
                        <span style="background-color: rgb(0, 147, 255); color: white; border-radius: 5px; padding-left: 3px; padding-right: 3px;"> {{ this }} </span>
                    </li>
	            {{/each}}
	            </ul>
	        </div>
	    {{/if}}
    </div>
{{/with}}
<!-- end EZ-history.tpl -->
