var reload = chrome.runtime.reload
function getel(id) { return document.getElementById(id) }

function ui_ready() {
    getel('main-loading').style.display = 'none'
    getel('main-content').style.display = 'block'

    if (window.webapp) {
        if (! (webapp.started || webapp.starting)) {
            // autostart ?
            webapp.start()
        }
    }
}

function settings_ready(d) {
    window.localOptions = d
    console.log('fetched local settings',d)
/*    
    if (d['retainstr']) {
        chrome.fileSystem.restoreEntry(d['retainstr'], function(entry) {
            if (entry) {
                //getel('current-folder').innerText = entry.fullPath
            }
        })

    }
*/
/*
    var persist_settings = ['port','optAllInterfaces','optBackground']
    for (var i=0; i<persist_settings.length; i++) {
        if (d[persist_settings[i]] !== undefined) {
            //getel('options')[persist_settings[i]] = d[persist_settings[i]]
        }
    }
*/

    window.webapp = bg.get_webapp(d)
    create_polymer_elements()
    on_webapp_change()
    webapp.on_status_change = on_webapp_change
    setup_events()
    ui_ready()
}

chrome.runtime.getBackgroundPage( function(bg) {
    window.bg = bg

    chrome.storage.local.get(null, settings_ready)
})

function get_status() {
    return {
        starting: webapp.starting,
        started: webapp.started,
        lasterr: webapp.lasterr,
        folder: bg.WSC.DirectoryEntryHandler.fs &&
            bg.WSC.DirectoryEntryHandler.fs.entry &&
            bg.WSC.DirectoryEntryHandler.fs.entry.fullPath
    }
}

function on_webapp_change() {
    var status = get_status()
    console.log('webapp changed',status)

    var c = document.getElementsByTagName('wsc-controls')[0]
    window.wc = c

    c.set('interfaces', webapp.urls.slice()) // why have to slice???
    c.set('port', webapp.port)
    c.set('folder', status.folder)
    c.set('started', webapp.started)
    c.set('starting', webapp.starting)
    c.set('lasterr', webapp.lasterr)



/*
    if (webapp.interfaces) {
        var ul = getel('interfaces')
        ul.innerHTML = ''
        for (var i=0; i<webapp.interfaces.length; i++) {
            var a = document.createElement('a')
            var url = 'http://' + webapp.interfaces[i] + ':' + webapp.port
            a.href = url
            a.innerText = url
            a.target = "_blank"
            var li = document.createElement('li')
            li.appendChild(a)
            ul.appendChild(li)
        }
    }
*/

/*
    if (webapp.lasterr) {
        console.log('webapp with error')
        getel('start-stop').disabled = false
        getel('start-stop').active = false
        getel('status-spinner').active = false
        getel('status-text').innerText = JSON.stringify(webapp.lasterr)
    } else if (webapp.starting) {
        console.log('webapp starting')
        getel('start-stop').disabled = true
        getel('status-spinner').active = true
        getel('status-text').innerText = "STARTING"
    } else if (webapp.started) {
        console.log('webapp started')
        getel('start-stop').disabled = false
        getel('start-stop').active = true
        getel('status-spinner').active = false
        getel('status-text').innerText = "STARTED"

    } else {
        console.log('webapp stopped')
        getel('start-stop').disabled = false
        getel('start-stop').active = false
        getel('status-spinner').active = false
        getel('status-text').innerText = "STOPPED"
    }
*/
}

function setup_events() {
    document.getElementById('help-icon').addEventListener('click', function(evt) {
        document.getElementById('help-dialog').open()
    })

/*
    getel('start-stop').addEventListener('click', function(evt) {
        
        var active = getel('start-stop').active

        if (active) {
            webapp.start()
        } else {
            webapp.stop()
        }
    })

    getel('choose-folder-button').addEventListener('click', function(evt) {

    })
*/
}

function create_polymer_elements() {
    Polymer({
        is: 'wsc-controls',
        properties: {
            interfaces: { type: Array,
                          value: [] },
            started: Boolean,
            starting: Boolean,
            lasterr: '??',
            folder: {type:String, value:'No folder selected'},
            port: {type:Number, value:6669},
            state: { type: String,
                     computed: 'computeState(started, starting, lasterr)' }
        },
        displayFolder: function(folder) {
            if (! folder) {
                return "NO FOLDER SELECTED"
            } else {
                return folder
            }
        },
        computeState: function(started, starting, lasterr) {
            if (lasterr) {
                return JSON.stringify(lasterr)
            } else if (starting) {
                return 'STARTING'
            } else if (started) {
                return 'STARTED'
            } else {
                return 'STOPPED'
            }
        },
        ready: function() {
            console.log('wsc-controls ready')
        },
        onChooseFolder: function() {
            console.log('clicked choose folder')

            function onchoosefolder(entry) {
                if (entry) {
                    var retainstr = chrome.fileSystem.retainEntry(entry)
                    var d = {'retainstr':retainstr}
                    chrome.storage.local.set(d)
                    console.log('set retainstr!')
                    if (window.webapp) {
                        bg.WSC.DirectoryEntryHandler.fs = new bg.WSC.FileSystem(entry)
                        if (webapp.handlers.length == 0) {
                            webapp.add_handler(['.*',WSC.DirectoryEntryHandler])
                            webapp.init_handlers()
                        }
                        webapp.change()
                    }
                    // reload UI, restart server... etc
                }
            }
            chrome.fileSystem.chooseEntry({type:'openDirectory'}, onchoosefolder)

        },
        onStartStop: function(evt) {
            if (! this.$$('#start-stop').active) { // changes before on-click
                console.log('stopping webapp')
                webapp.stop()
            } else {
                console.log('starting webapp')
                webapp.start()
            }

        }
    })

    Polymer({
        is: 'wsc-options',
        properties: {
            port: { type: Number,
                    value: webapp.port },
            optAllInterfaces: {
                type: Boolean,
                observer: 'interfaceChange',
                value: localOptions['optAllInterfaces']
            },
            optBackground: {
                type: Boolean,
                observer: 'backgroundChange',
                value: localOptions['optBackground']
            }
        },
        interfaceChange: function(val) {
            console.log('persist setting interface')
            webapp.opts.optAllInterfaces = this.optAllInterfaces
            chrome.storage.local.set({'optAllInterfaces':this.optAllInterfaces})
        },
        backgroundChange: function(val) {
            console.log('persist setting background')
            webapp.opts.optBackground = this.optBackground
            chrome.storage.local.set({'optBackground':this.optBackground})
        },
        onPortChange: function(val) {
            var port = parseInt(this.port)
            console.log('persist port',port)
            webapp.opts.port = port
            webapp.port = port
            chrome.storage.local.set({'port':port})
        }
    })
}
