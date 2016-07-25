{{#with data}}
<div class="cqz-result-h2 nopadding">
 <div class="EZ-Cliqz-Header"
        style="background-image: url({{cliqz_logo}})">
        {{#each social_contact}}
            <img  extra="title" url="{{url}}" class="EZ-Cliqz_Header-Contact-icon" src="{{logo}}" arrow-override=''/>
        {{/each}}
 </div>

 {{#with slogan}}
     <div style="background-color:{{background_color}}; color:{{text_color}};height:77px; padding-left:22px">
                <div class="EZ-Cliqz-Body-H1"> {{local 'cliqz_slogan_H1'}} </div>
                <div class="EZ-Cliqz-Body-H2">{{local 'cliqz_slogan_H2'}}</div>
     </div>
 {{/with}}

 <div class="EZ-Cliqz-Footer">
        <div class="cqz-ez-btn" style="background-color:{{Common_Questions.color}}"  url="{{Common_Questions.url}}">
            {{local 'cliqz_common_questions'}}
         </div>
        <div class="cqz-ez-btn" style="background-color:{{Give_Feedback.color}}"  url="{{Give_Feedback.url}}">
            {{local 'cliqz_give_feedback'}}
         </div>
        <div class="cqz-ez-btn" style="background-color:{{About_Us.color}}"  url="{{About_Us.url}}">
            {{local 'cliqz_about_us'}}
         </div>
        <div class="cqz-ez-btn" style="background-color:{{Jobs.color}}"  url="{{Jobs.url}}">
            {{local 'cliqz_jobs'}}
         </div>
        <div class="cqz-ez-btn" style="background-color:{{Privacy.color}}"  url="{{Privacy.url}}">
            {{local 'cliqz_privacy'}}
        </div>
        <div class="cqz-ez-btn" style="background-color:{{Blog.color}}"  url="{{Blog.url}}">
            {{local 'cliqz_blog'}}
        </div>
 </div>
</div>
{{/with}}
