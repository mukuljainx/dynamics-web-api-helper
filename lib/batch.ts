import stringify, { IOptions } from "./stringify";

type ActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ASSOCIATE"
  | "DISASSOCIATE"
  | "RETRIEVE"
  | "RETRIEVE_MULTIPLE";

const getMethod = (action: ActionType) => {
  const map: Record<ActionType, string> = {
    CREATE: "POST",
    UPDATE: "PATCH",
    DELETE: "DELETE",
    ASSOCIATE: "POST",
    DISASSOCIATE: "DELETE",
    RETRIEVE: "GET",
    RETRIEVE_MULTIPLE: "GET",
  };
  return map[action];
};

class BatchRequest {
  private batchId: string;
  private payload: string[];
  private transaction: string[];
  private fetchCall: string[];
  private fetchCallId: number;
  private changeSetId: string;
  private req: XMLHttpRequest;
  private transactionId: number;
  private baseUrl: string;

  /**
   *
   * @param baseUrl available from window.context.page.getClientUrl() + "/api/data/v9.1";
   */
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.batchId = `${new Date().getTime()}-batch-id`;
    this.transactionId = 1;
    this.fetchCallId = 1;
    this.changeSetId = `${new Date().getTime()}-change-set-id`;
    this.req = new XMLHttpRequest();
    this.req.open("POST", baseUrl + "/$batch", true);
    this.req.setRequestHeader("Accept", "application/json");
    this.req.setRequestHeader(
      "Content-Type",
      "multipart/mixed;boundary=batch_" + this.batchId
    );
    this.req.setRequestHeader("OData-MaxVersion", "4.0");
    this.req.setRequestHeader("OData-Version", "4.0");
    this.payload = [""];
    this.fetchCall = [""];
    this.transaction = [""];
    this.transaction.push("--batch_" + this.batchId);
    this.transaction.push(
      "Content-Type: multipart/mixed;boundary=changeset_" + this.changeSetId
    );
    this.transaction.push("");
  }

  public addTransaction = ({
    entityId,
    entityName,
    action,
    payload,
    relation,
  }: {
    entityName: string;
    action: ActionType;
    entityId?: string;
    payload?: Record<string, string | number>;
    relation?: {
      relationName: string;
      entityName: string;
      entityId: string;
    };
  }) => {
    if (action === "DISASSOCIATE") {
      throw Error("DISASSOCIATE is not supported yet.");
    }

    const method = getMethod(action);
    const isUpdateType = [
      "UPDATE",
      "DELETE",
      "DISASSOCIATE",
      "ASSOCIATE",
    ].includes(action);
    const isAssociateType = ["ASSOCIATE", "DISASSOCIATE"].includes(action);
    const isDeleteType = ["DELETE", "DISASSOCIATE"].includes(action);

    const association: Record<string, string> = {};

    let associationPath = "";
    if (relation && action === "ASSOCIATE") {
      associationPath = `/${relation.relationName}/$ref`;
      association["@odata.id"] =
        this.baseUrl + `/${relation.entityName}(${entityId})`;
    }

    this.transaction.push("--changeset_" + this.changeSetId);
    this.transaction.push("Content-Type: application/http");
    this.transaction.push("Content-Transfer-Encoding:binary");
    this.transaction.push(`Content-ID: ${this.transactionId}`);
    this.transaction.push("");
    this.transaction.push(
      `${method} ${this.baseUrl}/${entityName}${
        isUpdateType ? `(${entityId})` : ""
      }${isAssociateType ? associationPath : ""} HTTP/1.1`
    );
    this.transaction.push("Content-Type: application/json;");
    this.transaction.push("");
    if (!isDeleteType) {
      this.transaction.push(JSON.stringify(payload || association));
      this.transaction.push("");
    }
    this.transactionId++;
  };

  public addFetchCall = (entityName: string, options: IOptions) => {
    this.fetchCall.push("--batch_" + this.batchId);
    this.fetchCall.push("Content-Type: application/http");
    this.fetchCall.push("Content-Transfer-Encoding:binary");
    this.fetchCall.push("");
    this.fetchCall.push(
      `GET ${this.baseUrl}/${entityName}${stringify(options)} HTTP/1.1`
    );
    this.fetchCall.push("Accept: application/json");
    this.fetchCall.push("");
    this.fetchCallId++;
  };

  public done = () => {
    const self = this;
    const req = this.req;
    if (self.transactionId > 1) {
      self.transaction.push("--changeset_" + self.changeSetId + "--");
      self.transaction.push("");
      self.payload.push(...self.transaction);
    }

    if (self.fetchCallId > 1) {
      self.payload.push(...self.fetchCall);
    }

    self.payload.push("--batch_" + self.batchId + "--");

    const finalPayload = self.payload.join("\r\n");

    return new Promise((resolve, reject) => {
      req.onreadystatechange = function () {
        if (req.readyState == 4 /* complete */) {
          req.onreadystatechange = null;
          if (req.status == 200) {
            const response = req.response
              .split("--batchresponse")
              .map((temp: string) => {
                const first = temp.indexOf("{");
                let json = {};
                try {
                  json = JSON.parse(temp.substring(first));
                } catch (e) {
                  console.log(e, temp);
                }
                return json;
              });
            resolve(response.filter((j: object) => Object.keys(j).length));
          } else {
            console.log(req);
            reject(req);
          }
        }
      };

      this.req.send(finalPayload);
    });
  };
}

export default BatchRequest;