/**
 * Javascript for Agent web interface
 */


angular.module('controller', ['ngResource']);

Object.keys = Object.keys || (function () {
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !{toString:null}.propertyIsEnumerable("toString"),
        DontEnums = [ 
            'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty',
            'isPrototypeOf', 'propertyIsEnumerable', 'constructor'
        ],
        DontEnumsLength = DontEnums.length;

    return function (o) {
        if (typeof o != "object" && typeof o != "function" || o === null)
            throw new TypeError("Object.keys called on a non-object");

        var result = [];
        for (var name in o) {
            if (hasOwnProperty.call(o, name))
                result.push(name);
        }

        if (hasDontEnumBug) {
            for (var i = 0; i < DontEnumsLength; i++) {
                if (hasOwnProperty.call(o, DontEnums[i]))
                    result.push(DontEnums[i]);
            }   
        }

        return result;
    };
	})(); 


/**
 * Adjust the height of given textarea to match its contents
 * @param {Element} elem HTML DOM Textarea element
 */
function resize (elem) {
    var scrollTop = document.body.scrollTop;

    elem.style.height = 'auto';
    elem.style.height = (elem.scrollHeight + 20) + 'px';

    document.body.scrollTop = scrollTop;  // restore the scroll top
}

/**
 * @constructor Controller
 * Angular JS controller to control the page
 */
function Controller($scope, $resource) {
    var loadingText = '...';
    var href = document.location.pathname;
    var lastSlash = href.lastIndexOf('/');
    var url = href.substring(0, lastSlash + 1);
    var urlParts = url.split('/');
    urlParts.pop(); // remove last empty entry
    var id = urlParts.pop();
    document.title = id;

    $scope.url         = url;
    $scope.id          = id;
    $scope.urls        = undefined;
    $scope.version     = undefined;
    $scope.description = undefined;
    $scope.type        = undefined;
    $scope.mode = 'form';

    // form
    $scope.methods = undefined;
    $scope.method = undefined;
    $scope.result = '';
    $scope.formStatus = '';

    // json rpc
    $scope.request = undefined;
    $scope.response = undefined;
    $scope.rpcStatus = '';

    // define a RESTful resource
    var agent = $resource(url + ':resource', {}, {
        'post': {method: 'POST'}
    });

    /**
     * Send a json rpc message
     * @param {String} method
     * @param {Object} params
     * @param {function} callback   called with parameters err, result
     */
    function send (method, params, callback) {
        var request = {
            'jsonrpc': "2.0",
            'id': 1,
            'method': method,
            'params': params || {}
        };
        agent.post({}, request, function(response) {
            if (response.error) {
                var err = response.error;
                $scope.error = 'Error ' + err.code + ': ' + err.message +
                    ((err.data && err.data.description) ? ', ' + err.data.description : '');
            } else {
               $scope.error = "";
            }
            callback(response.error, response.result);
        }, function (err) {
            callback(err, undefined);
            console.log(err);
        });
    }

    /**
     * Change the currently selected method
     */
    $scope.setMethod = function () {
    	var keys = Object.keys($scope.methods);
        for (var i = 0; i < keys.length; i++) {
            var method = keys[i];
            if (method == $scope.methodName) {
                $scope.method = $scope.methods[method];
				$scope.request = JSON.stringify(form2json(true), null, 2);
                break;
            }
        }
    };

    /**
     * Check whether a given type is a primitive type like 'string', 'long',
     * 'double', but not some complex type like 'Map<String, String>' or
     * 'Contact'.
     * @param {String} type   The name of a type
     * @return {boolean}      True if primitive, else false
     */
    $scope.isPrimitiveType = function (type) {
        if (type == null || typeof type == "undefined") return false;
        var primitives = ['string', 'char', 'long', 'double', 'int',
            'number', 'float', 'byte', 'short', 'boolean'];
        return (primitives.indexOf(type.toLowerCase()) != -1);
    };

    /**
     * Format the given date as string
     * @param {Date | Number} date
     * @return {String} formattedDate
     */
    $scope.formatDate = function(date) {
        var d = new Date(date);
        return d.toISOString ? d.toISOString() : d.toString();
    };

	function formExample(type){
		if (type.type == "object" && typeof type.properties != "undefined"){		
			var result = {};
			var keys = Object.keys(type.properties);
			for (var i = 0; i < keys.length; i++){
				var val = type.properties[keys[i]];
				result[keys[i]]=formExample(val);
			}
			return result;
		} else if (type.type == "array") {
			var result = [];
			result.push(formExample(type.items));
			return result;
		} else if (type.type == "string"){
			return "EXAMPLE";
		} else if (type.type == "boolean"){
		    return true;
		} else if (type.type == "integer" || type.type == "number"){
			return 0;
		} else if (type.type == "null"){
			return null;
		}
		return null;
	}

    function form2json(doExample) {
            var request = {};
            request.id = 1;
            request.jsonrpc = "2.0";
	    	if (typeof $scope.method == "undefined"){
	            request.method = "getMethods";
	            request.params = {};
		   		return request;
            }
            request.method = $scope.methodName;
            request.params = {};
            for (var i = 0; i < $scope.method.params.length; i++) {
                var param = $scope.method.params[i];
                if ((param.type.type == "object" || param.type.type == "array") && doExample && !param.value){
                	param.value = JSON.stringify(formExample(param.type));
                } 
                if (param.required || (param.value && param.value.length > 0) ) {
                    if (param.type.type == 'string') {
                        request.params[param.name] = param.value;
                    } else {
                        request.params[param.name] = param.value?JSON.parse(param.value):null;
                    }
                }
            }
		return request;
    }

    /**
     * Send an JSON-RPC request.
     * The request is built up from the current values in the form,
     * and the field result in the response is filled in in the field #result
     */
    $scope.sendForm = function () {
        try {
            var request = form2json(false);
            var start = +new Date();
            $scope.formStatus = 'sending...';
            agent.post({}, request, function (response) {
                var end = +new Date();
                var diff = (end - start);
                $scope.formStatus = 'ready in ' + diff + ' ms';

                if (response.error) {
                    var err = response.error;
                    $scope.result = 'Error: ' + err.code+ ":"+ err.message + "\nBody:" + JSON.stringify(err, null, 2);
    	            $scope.error = 'Error ' + err.code + ': ' + err.message +
        	            ((err.data && err.data.description) ? ', ' + err.data.description : '');
                }
                else {
                    if (response.result instanceof Object) {
                        $scope.result = JSON.stringify(response.result, null, 2) || '';
                    }
                    else {
                        $scope.result = (response.result != undefined) ? String(response.result) : '';
                    }
          		    $scope.error = "";
                }

                $scope.resize(document.getElementById('result'));
            }, function (err) {
                $scope.formStatus = 'failed. Error: ' + JSON.stringify(err);
                $scope.result = '';
            });
        }
        catch (err) {
            $scope.formStatus = 'Error: ' + err;
            $scope.result = '';
        }
    };

    /**
     * Resize given element after a delay of 0ms
     * @param elem
     */
    $scope.resize = function (elem) {
        setTimeout(function () {
            resize(elem);
        }, 0);
    };

    /**
     * Send a JSON-RPC request.
     * The request is read from the field #request, and the response is
     * filled in in the field #response
     */
    $scope.sendJsonRpc = function() {
        try {
            var request = JSON.parse($scope.request);
            $scope.request = JSON.stringify(request, null, 2);
            resize(document.getElementById('request'));

            $scope.rpcStatus = 'sending...';
            var start = +new Date();
            agent.post({}, request, function (response) {
                var end = +new Date();
                var diff = (end - start);
                $scope.response = JSON.stringify(response, null, 2);
                $scope.rpcStatus = 'ready in ' + diff + ' ms';

				if (response.error){
					var err = response.error;
				    $scope.error = 'Error ' + err.code + ': ' + err.message +
        	            ((err.data && err.data.description) ? ', ' + err.data.description : '');
				} else {
				    $scope.error = "";
				}

                $scope.resize(document.getElementById('response'));
            }, function (err) {
                $scope.rpcStatus = 'failed. Error: ' + JSON.stringify(err);
                $scope.response = '';
            });
        }
        catch (err) {
            $scope.rpcStatus = 'Error: ' + err;
            $scope.response = ''
        }
    };
  

    /**
     * Load information and data from the agent via JSON-RPC calls.
     * Retrieve the methods, type, id, description, etc.
     */
    $scope.load = function () {

        // get id
        send ('getId', {}, function (err, result) {
            if (!err) {
                $scope.id = result;
                document.title = result;
            }
        });

        // get urls
        send ('getUrls', {}, function (err, result) {
            if (!err) {
                $scope.urls = result;
            }
        });
        
        // get type
        send ('getType', {}, function (err, result) {
            if (!err) {
                $scope.type = result;
            }
        });

        // get methods
        send ('getMethods', {}, function (err, result) {
            if (!err) {
                $scope.methods = result;
                $scope.methodKeys = Object.keys(result).sort();
                $scope.methodName = $scope.methodKeys[0];
                $scope.setMethod();
				
				// update method select box and the json version
                setTimeout(function () {
                    new Chosen(document.getElementById('methods'));
		    		$scope.request = JSON.stringify(form2json(true), null, 2);
                }, 15);
            }
        });
    };

    $scope.request = JSON.stringify(form2json(true), null, 2);
	$scope.methodKeys = [];
    $scope.loading = true;
    $scope.load();
}
