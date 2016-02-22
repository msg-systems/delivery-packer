# msg-js-spa-framework

JavaScript SinglePageApp(SPA) Framework is a lightweight framework for building SPA libraries.

Major goals are:

- Definition of a standard set of frameworks used for SPA development
- Providing a library build mechanism that easily assembles the SPA library, that is still adoptable and highly flexible for the needs of the concrete SPA
- Using the `msg-js-spa-framework` should therefor minimize the configuration time of the SPA Library building    

For example a single page application needs to adress alot of tasks like:

- DOM-Manipulation
- HTML Markups
- HTML Styling using CSS
- Responsive Design
- Browser navigation
- Drag & Drop
- Browser differences and incompatibilities
- Internationalization
	- Dates
	- Numbers
	- Texts
- Error handling
- Keyboard control
- Touch and gesture control
- Symbols, icons and images
- UI Widgets
- and many more

Sometimes you want to cover all of the applications needs with a single framework like Angular or ExtJS but sometimes you want to cherry pick the best frameworks to adress specific needs. Then you need to assemble your own library stack by hand. `msg-js-spa-framework` does exactly this for you. 

## Standard set of frameworks 
In order to build up a library stack that covers most of the applications need we assemble the following frameworks
<table style="width:100%">
<tbody>
  <tr>
     <th>Task</th>
     <th>Framework</th>
	 <th>Version</th>
  </tr>
  <tr>
     <td style ="width: 33%;">DOM-Manipulation</td>
     <td style ="width: 33%">jQuery</td>
	 <td>2.2.0</td>
  </tr>
 </tbody>
</table>