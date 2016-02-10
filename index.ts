import storeobj = require("mach-storeobj");
import timerdaemon = require("timerdaemon");
import * as Promise from "bluebird";
let PouchDB = require("pouchdb");

interface IComponents {
    type: string;
    uid: string;
}


interface AudioChannelAnswer {
    dev: string;
    active: boolean;
}

interface AudioAnswer {
    label: string;
    dev: string;
    pulsename: string;
    active: boolean;
    channels: AudioChannelAnswer[];
}

interface VideoChannelAnswer {
    dev: string;
    label: string;
    active: boolean;
}

interface VideoAnswer {
    dev: string;
    label: string;
    active: boolean;
    channels: VideoChannelAnswer[];
    model_id: string;
    vendor_id: string;
    resolution: string;
    bus: string;
    serial: string;
}


interface ScanAnswer {
    essid: string;
    mac: string;
    signal: string;
}

interface NetworkAnswer {
    type: string;
    mac: string;
    interface: string;
    essid?: string;
    scan?: ScanAnswer[];
    ip?: string;
    gateway?: string;
}



interface LsusbdevAnswer {
    dev: string;
    type: string;
    hub: string;
    product: string;
    id: string;
}

interface GetDrivesAnswer {
    filesystem: string;
    blocks: string;
    used: string;
    available: string;
    capacity: string;
    mounted: string;
}

interface IOnlineAnswer {
    bootId: string;
    bootTime: number;
    updatedAt: number;
    usbDevices: LsusbdevAnswer[];
    drives: GetDrivesAnswer[];
    networks: NetworkAnswer[];
    video: {
        inputs: VideoAnswer[];
    };
    audio: {
        inputs: AudioAnswer[];
    };
}


interface IConstructor {
    storeurl: string;
    remote?: string;
    sync?: boolean;
}


interface IStorepouch {
    storeurl: string;
    components: IComponents[];
    serial: string;
    timezone: string;
    remote?: string;
    sync?: boolean;
}

interface IObject {
    _id: string;
    updatedAt: string;
    type: string;
}

interface IStatus {
    (obj?: any, type?: string): IObject;
}
interface IData {
    (obj: any, uid: string): IObject;
}
interface INewObj {
    (uid: string);
}
interface IStoreApi {
    timezone: string;
    serial: string;
    components: IComponents[];
    system: IOnlineAnswer;
    status: IStatus;
    data: IData;
    new: INewObj;

}

interface IWhere {
    from?: number;
    to?: number;
    uid?: string;
    serial?: string;
}


function TimeNow() {
    return new Date().getTime();
}

interface IClient {
    uid: string;
    type?: string;
}

function insert(Storedb, obj) {
    return new Promise<boolean>(function(resolve, reject) {
        if (obj._rev) {
            delete obj._rev
        }
        Storedb.get(obj._id).then(function(ob) {
            obj._rev = ob._rev
            Storedb.put(obj).then(function() {
                resolve(true);
            }).catch(function(err) {
                reject(err);
            });
        }).catch(function(err) {
            if (err.status === 404) {
                Storedb.post(obj).then(function() {
                    resolve(true);
                }).catch(function(err) {
                    reject(err);
                });
            } else {
                reject(err);
            }

        });

    });
}

function remove(Storedb, _id) {
    return new Promise<boolean>(function(resolve, reject) {

        Storedb.get(_id).then(function(ob) {
            Storedb.remove(ob).then(function() {
                resolve(true);
            }).catch(function(err) {
                reject(err);
            });
        }).catch(function(err) {
            if (err.status === 404) {
                resolve(true);
            } else {
                reject(err);
            }

        });

    });
}

export = class Store {


    localDB: Function;
    remoteDB: Function;
    sync: Function;
    storeobj: IStoreApi;
    clients: IClient[];

    constructor(conf: IStorepouch) {


        this.storeobj = new storeobj(conf.components, conf.serial, conf.timezone);

        if (conf.storeurl) {
            this.localDB = new PouchDB(conf.storeurl);
        } else {
            throw Error("no db specified");
        }

        if (conf.remote) {
            this.remoteDB = new PouchDB(conf.remote);

            if (conf.sync) {

                this.sync = PouchDB.sync(conf.storeurl, conf.remote, {
                    live: true,
                    retry: true
                }).on("change", function(info) {
                    // handle change
                }).on("paused", function() {
                    // replication paused (e.g. user went offline)
                }).on("active", function() {
                    // replicate resumed (e.g. user went back online)
                }).on("denied", function(info) {
                    // a document failed to replicate (e.g. due to permissions)
                }).on("complete", function(info) {
                    // handle complete
                }).on("error", function(err) {
                    console.log(err);
                });

            }
        }
    }

    new(uid: string) {
        return this.storeobj.new(uid);
    }

    saveStatus(url?: string) {

        let Storedb: any;
        if (!url || url === "local") {
            Storedb = this.localDB;
        } else if (url === "remote") {
            Storedb = this.remoteDB;
        } else {
            Storedb = new PouchDB(url);
        }

        return insert(Storedb, this.storeobj.status());

    }

    heartbeat(url: string, time?: number) {
        let Storedb: any;
        let t: number;
        if (!url || url === "local") {
            Storedb = this.localDB;
        } else if (url === "remote") {
            Storedb = this.remoteDB;
        } else {
            Storedb = new PouchDB(url);
        }
        if (time) {
            t = time;
        } else {
            t = 30000;
        }
        if (time === 0) {
            return insert(Storedb, this.storeobj.status());
        } else {
            console.log("daemonized heartbeat");
            timerdaemon.pre(t, function() {

                insert(Storedb, this.storeobj.status()).then(function() {

                }).catch(function(err) {

                });


            });

        }


    }

    save(obj: any, uid: string) {
        return insert(this.localDB, this.storeobj.data(obj, uid));
    }
    remove(uid: string) {
        return remove(this.localDB, uid);
    }
    replicate(remote?: any) {

    }

    update(object: any, uid: string) {
        let Storedb: any = this.localDB;
        let obj = this.storeobj.data(object, uid);
        return new Promise<boolean>(function(resolve, reject) {

            Storedb.get(obj._id).then(function() {
                Storedb.put({}).then(function() {
                    resolve(true);
                }).catch(function(err) {
                    reject(err);
                });
            }).catch(function(err) {
                reject(err);
            });
        });
    }

    get(_id) {
        let Storedb: any = this.localDB;
        return Storedb.get(_id);
    }

    where(where: IWhere) {

        if (where.from && !where.to) {
            where.to = TimeNow();
        }

    }

    addclient(Client: IClient) {
        let exist = false;
        for (let i = 0; i < this.clients.length; i++) {

            if (this.clients[i].uid === Client.uid) {
                exist = true;
            }
        }

        if (exist) {
            return new Promise<boolean>(function(resolve, reject) {

                resolve(true);
            });
        } else {

            return insert("ss", "dd");

        }


    }




    remclient(uid: string) {

        let exist = false;
        for (let i = 0; i < this.clients.length; i++) {

            if (this.clients[i].uid === uid) {
                exist = true
            }
        }

        if (exist) {
            return new Promise<boolean>(function(resolve, reject) {

                resolve(true);
            });
        } else {

            return insert("ss", "dd");

        }



    }



}