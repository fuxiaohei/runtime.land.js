use clap::{CommandFactory, Parser};
use color_print::cprintln;
use tracing::level_filters::LevelFilter;

mod cmds;
mod js_files;
mod js_draft;

#[derive(Parser, Debug)]
enum SubCommands {
    Build(cmds::Build),
    Up(cmds::Up),
}

#[derive(Parser, Debug)]
#[clap(author, version)]
#[clap(disable_version_flag = true)] // handled manually
#[clap(
    name = env!("CARGO_PKG_NAME"),
    about = concat!(env!("CARGO_PKG_NAME")," ",env!("CARGO_PKG_VERSION")),
)]
struct CliArgs {
    #[clap(subcommand)]
    cmd: Option<SubCommands>,
    /// Generate verbose output
    #[clap(short, long, global = true)]
    pub verbose: bool,
}

#[tokio::main]
async fn main() {
    let args = CliArgs::parse();

    // Init tracing
    let filter = if args.verbose {
        LevelFilter::DEBUG
    } else {
        LevelFilter::INFO
    };
    tracing_subscriber::fmt()
        .with_target(false)
        .with_level(true)
        .with_max_level(filter)
        .init();

    // Run subcommand
    let res = match args.cmd {
        Some(SubCommands::Build(b)) => b.run().await,
        Some(SubCommands::Up(u)) => u.run().await,
        None => {
            CliArgs::command().print_long_help().unwrap();
            std::process::exit(2);
        }
    };
    if let Err(err) = res {
        cprintln!("<red>Something wrong:\n  {}</red>", err);
        std::process::exit(2);
    }
}
