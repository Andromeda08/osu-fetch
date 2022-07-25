const chalk = require('chalk');
const dotenv = require('dotenv');

class Log {
  static info  = (message: string) => console.log(`${Log.make_prefix(chalk.blue('info'))} ${message}`);
  static error = (message: string) => console.log(`${Log.make_prefix(chalk.red('error'))} ${message}`);
  static req   = (message: string) => console.log(`${Log.make_prefix(chalk.yellow('req'))} ${chalk.gray(message)}`);
  static res   = (message: string) => console.log(`${Log.make_prefix(chalk.magenta('res'))} ${message}`);
  private static make_prefix = (prefix: string): string => { return `${chalk.gray('[')}${prefix}${chalk.gray(']')}`; };
};

const env_check = () => {
  const client_id = process.env.OSU_CLIENT_ID;
  const client_secret = process.env.OSU_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    Log.error(chalk.gray('One or more required environment variables are missing! ✖'));
    process.exit();
  }
  else {
    Log.info(chalk.gray('Environment variables ok ✔'));
  }
};

const secondsToHnM = (t: number) => {
  const hours = Math.floor(t/3600);
  const minutes = Math.round(Math.floor((t/60 - hours*60))).toFixed(0);
  return `${hours}h ${minutes}m`;
};

const get_stats = async (username: string, token: string) => {
  Log.req(`Fetching user [${ chalk.cyan.bold(username) }]`);
  
  const user: any = await fetch(
    `https://osu.ppy.sh/api/v2/users/${ username }`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${ token }`,
      },
    }
  ).then(res => res.json());

  if (typeof user.username === 'undefined') {
    Log.error(`User ${username} not found ✖`);
    return;
  }
  else {
    Log.res(`Got user ${user.username} ✔`);
  }

  Log.req(`Fetching scores of [${ chalk.cyan.bold(username) }]`);
  const scores: any = await fetch(
    `https://osu.ppy.sh/api/v2/users/${ user.id }/scores/best?limit=10`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${ token }`,
      },
    }
  ).then(res => res.json());

  if (typeof scores[0] === 'undefined') {
    Log.error(`Scores for ${username} not found ✖`);
    return;
  }
  else {
    Log.res(`Got scores for ${user.username} ✔`);
  }

  // Header
  console.log(`${ chalk.gray.bold('[ Statistics for') } ${chalk.magenta.bold(user["username"])} ${ chalk.gray.bold(']') }`);
  
  // Generic statistics
  console.log(`${ chalk.red.bold('|') } ${ chalk.bold(Math.round(user["statistics"]["pp"])) }\t${ chalk.gray('pp') }`);
  console.log(`${ chalk.magenta.bold('|') } ${ chalk.bold(user["statistics"]["hit_accuracy"].toFixed(2)) }${ chalk.gray('%\taccuracy') }`);
  console.log(`${ chalk.blue.bold('|') } ${ chalk.bold(user["statistics"]["global_rank"]) }\t${ chalk.gray('global rank') }`);
  console.log(`${ chalk.cyan.bold('|') } ${ chalk.bold(user["statistics"]["play_count"]) }\t${ chalk.gray('play count') }`);
  console.log(`${ chalk.green.bold('|') } ${ chalk.bold(secondsToHnM(user["statistics"]["play_time"])) }\t${ chalk.gray('play time') }`);
  console.log(`${ chalk.yellow.bold('|') } ${ chalk.bold(user["statistics"]["level"]["current"]) }\t${ chalk.gray('level') }`);
  
  // Rank count
  const { ssh, ss, sh, s, a } = user["statistics"]["grade_counts"];
  const total = ssh + ss + sh + s;

  console.log(`${ chalk.gray.bold('[ Grades ]') }`);

  console.log(`${ chalk.gray.bold('||') } ${ chalk.bold(ssh) }\t${ chalk.gray('ssh') }`);
  console.log(`${ chalk.yellow.bold('||') } ${ chalk.bold(ss) }\t${ chalk.gray('ss') }`);
  console.log(`${ chalk.gray.bold(' |') } ${ chalk.bold(sh) }\t${ chalk.gray('sh') }`);
  console.log(`${ chalk.yellow.bold(' |') } ${ chalk.bold(s) }\t${ chalk.gray('s') }`);
  console.log(`${ chalk.green.bold(' |') } ${ chalk.bold(a) }\t${ chalk.gray('a') }`);

  console.log(`${ chalk.cyan(' |')} ${ chalk.bold(total)}\t${ chalk.gray('total S+ ranks')}`);

  // Top 10 Plays
  console.log(`${ chalk.gray.bold('[ Top plays ]') }`);

  scores.map((e: any, i: number) => {
    const s = () => { return `${e["beatmapset"]["title"]} ${chalk.gray('by')} ${e["beatmapset"]["artist"]} ${chalk.gray('[')}${chalk.magenta(e["beatmap"]["version"])}${chalk.gray(']')}\t${chalk.cyan.bold( Math.round(e["pp"]))} ${chalk.gray('pp')}` };
    switch (i) {
      case 0:
        console.log(`${ chalk.gray('[') }${ chalk.red.bold(i + 1) }${ chalk.gray(']') } ${ s() }`);
        break;
      case 1:
        console.log(`${ chalk.gray('[') }${ chalk.magenta.bold(i + 1) }${ chalk.gray(']') } ${ s() }`);
        break;
      case 2:
        console.log(`${ chalk.gray('[') }${ chalk.blue.bold(i + 1) }${ chalk.gray(']') } ${ s() }`);
        break;
      default:
        console.log(`${ chalk.gray('[') }${ chalk.bold(i + 1) }${ chalk.gray(']') } ${ s() }`);
        break;
    }
  });
};

const main = async () => {
  var exit_requested = false;
  var app_mode = !(typeof process.argv.slice(2)[0] === 'string');

  dotenv.config();
  env_check();

  const prompt = require('prompt-sync')({ sigint: true });
  const token = await fetch(
    "https://osu.ppy.sh/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        "client_id": process.env.OSU_CLIENT_ID,
        "client_secret": process.env.OSU_CLIENT_SECRET,
        "grant_type": "client_credentials",
        "scope": "public"
      }),
    }
  )
  .then(res => res.json())
  .then(res => { return res["access_token"] });

  if (typeof token === 'undefined') {
    Log.error(`No token ✖`);
    process.exit();
  }
  else {
    Log.res(`Got token ✔`);
  }

  if (app_mode) {
    while (!exit_requested) {
      var user = prompt(`${ chalk.gray.bold("Enter username or 'q' to quit: ") }`);
      if (user === 'q') {
        exit_requested = true;
      }
      else {
        await get_stats(user, token);
      }
    }
  
    console.log(chalk.gray('Bye 👋'));
  }
  else {
    get_stats(process.argv.slice(2)[0], token);
  }
};

process.removeAllListeners('warning');
main();
