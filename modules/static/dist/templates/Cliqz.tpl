{{#with data}}
<div class="cqz-result-h2 nopadding">
 <div class="EZ-Cliqz-Header"
        style="background-image: url({{cliqz_logo}})" arrow-override=''>
        {{#each social_contact}}
            <img  extra="title" url="{{url}}" class="EZ-Cliqz_Header-Contact-icon" src="{{logo}}" />
        {{/each}}
 </div>

 {{#with slogan}}
     <div style="background-color:{{background_color}}; color:{{text_color}};height:77px; padding-left:22px">
                <div class="EZ-Cliqz-Body-H1"> {{local 'cliqz_slogan_H1'}} </div>
                <div class="EZ-Cliqz-Body-H2">{{local 'cliqz_slogan_H2'}}</div>
     </div>
 {{/with}}

 <div class="EZ-Cliqz-Footer">
        <div arrow="false" class="cqz-ez-btn cliqz-brands-button-1" url="{{Common_Questions.url}}" extra="common-questions">
            {{local 'cliqz_common_questions'}}
         </div>
        <div arrow="false" class="cqz-ez-btn cliqz-brands-button-6" url="{{Give_Feedback.url}}" extra="give-feedback">
            {{local 'cliqz_give_feedback'}}
         </div>
        <div arrow="false" class="cqz-ez-btn cliqz-brands-button-10" url="{{About_Us.url}}" extra="about-us">
            {{local 'cliqz_about_us'}}
         </div>
        <div arrow="false" class="cqz-ez-btn cliqz-brands-button-10" url="{{Jobs.url}}" extra="jobs">
            {{local 'cliqz_jobs'}}
         </div>
        <div arrow="false" class="cqz-ez-btn cliqz-brands-button-10" url="{{Privacy.url}}" extra="privacy">
            {{local 'cliqz_privacy'}}
        </div>
        <div arrow="false" class="cqz-ez-btn cliqz-brands-button-10" url="{{Blog.url}}" extra="blog">
            {{local 'cliqz_blog'}}
        </div>
 </div>
</div>
{{/with}}
